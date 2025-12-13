// Helper utilities for mapping and path building

import type { Logger } from '@nestjs/common';

import type { JobSelectionType } from '@repo/common/constants/order.constant';

import type { QnapService } from '../qnap/qnap.service';

import { QnapApiError } from '../qnap/qnap.types';

export const joinPath = (base: string, suffix: string) => {
    const b = String(base || '').replace(/[\\/]+$/, '');

    const s = String(suffix || '').replace(/^[\\/]+/, '');

    return `${b}/${s}`;
};

export const escapeRegex = (s: string) =>
    String(s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

/**
 * Map windows/UNC path or QNAP path to QNAP-style path with drive mapping.
 * Accepts optional rawMap JSON or a CSV style mapping (e.g. 'P:Production')
 */

export function mapFolderPathToQnapPath(
    input: string,

    rawMap?: string | null,
): string {
    const str = String(input || '').trim();

    if (!str) return '';

    if (str.startsWith('/')) return str.replace(/\\+/g, '/');

    const mapping: Record<string, string> = { P: 'Production' };

    if (rawMap) {
        try {
            const parsed = JSON.parse(rawMap) as Record<string, unknown>;

            if (typeof parsed === 'object' && parsed !== null) {
                for (const [k, v] of Object.entries(parsed)) {
                    mapping[String(k).toUpperCase()] = String(v);
                }
            }
        } catch {
            try {
                rawMap.split(',').forEach(pair => {
                    const [k, v] = pair.split(':');

                    if (k && v) mapping[String(k).toUpperCase()] = String(v);
                });
            } catch {
                /* ignore */
            }
        }
    }

    // Windows drive e.g. P:\\path\\to

    const winDrive = str.match(/^([A-Za-z]):[\\/](.*)$/);

    if (winDrive && winDrive[1]) {
        const drive = String(winDrive[1]).toUpperCase();

        const rest = String(winDrive[2] ?? '').replace(/\\+/g, '/');

        const share = mapping[drive] || drive;

        return `/${share}/${rest}`;
    }

    // UNC path e.g. \\\\server\\share\\rest

    const unc = str.match(/^\\\\[^\\]+\\([^\\]+)\\?(.*)$/);

    if (unc) {
        const share = unc[1];

        const rest = (unc[2] || '').replace(/\\+/g, '/');

        return `/${share}/${rest}`;
    }

    return `/${str.replace(/\\+/g, '/')}`;
}

/**
 * Decide the candidate suffix (sub-path) based on job type and fileCondition
 */

export function getCandidateSuffix(
    normalizedType: string,

    normalizedCondition: string,

    qcStep?: number,
): string {
    if (normalizedType === 'general' || normalizedType === 'test') {
        return normalizedCondition === 'incomplete'
            ? 'PRODUCTION/PARTIALLY DONE'
            : 'RAW';
    }

    if (normalizedType.startsWith('qc')) {
        const step = Number(qcStep) || 1;

        if (normalizedCondition === 'incomplete') {
            // QC1 => QC/QC1/PARTIALLY DONE, QC2 => QC/QC2/PARTIALLY DONE

            return `QC/QC${step}/PARTIALLY DONE`;
        }

        // fresh condition: QC1 -> PRODUCTION/DONE, QC2 -> QC/QC1/DONE

        if (step === 1) return 'PRODUCTION/DONE';

        if (step === 2) return 'QC/QC1/DONE';

        // fallback

        return 'PRODUCTION/DONE';
    }

    if (normalizedType.startsWith('correction')) {
        return normalizedCondition === 'incomplete'
            ? 'FEEDBACK/PARTIALLY DONE'
            : 'FEEDBACK';
    }

    // fallback

    return normalizedCondition === 'incomplete'
        ? 'PRODUCTION/PARTIALLY DONE'
        : 'RAW';
}

export const computeTotalPauseDuration = (file: any, now: Date) => {
    const accumulated = Number(file?.total_pause_duration || 0);
    const isPaused = file?.status === 'paused';
    const pauseStart = file?.pause_start_timestamp
        ? new Date(file.pause_start_timestamp as string | number | Date)
        : null;
    if (isPaused && pauseStart) {
        return accumulated + Math.max(0, now.getTime() - pauseStart.getTime());
    }
    return accumulated;
};

export function getDoneSuffix(
    normalizedType: string,

    qcStep?: number,
): string {
    if (normalizedType === 'general' || normalizedType === 'test') {
        return 'PRODUCTION/DONE';
    }

    if (normalizedType.startsWith('qc')) {
        const step = Number(qcStep) || 1;

        if (step === 1) return 'QC/QC1/DONE';

        if (step === 2) return 'QC/QC2/DONE';

        return 'QC/QC1/DONE';
    }

    if (normalizedType.startsWith('correction')) {
        return 'FEEDBACK/DONE';
    }

    return 'PRODUCTION/DONE';
}

export const sanitizePathSegment = (input: string): string => {
    const cleaned = String(input || '')
        .trim()

        .replace(/[\\/]+/g, '-')

        .replace(/\s+/g, ' ');

    return cleaned || 'employee';
};

/**
 * QNAP listFolderContents responses vary (stringified JSON, raw objects, or nested under `data`).
 * Normalize into a consistent payload for downstream parsing.
 */
export function normalizeQnapListPayload(resp: any): any {
    if (typeof resp === 'string') {
        try {
            return JSON.parse(resp);
        } catch {
            return resp;
        }
    }
    if (resp && typeof resp === 'object' && 'data' in resp) {
        const maybeData = (resp as Record<string, unknown>).data;
        if (maybeData !== undefined) return maybeData;
    }
    return resp;
}

export type QnapEntry = { name: string; isFolder: boolean };

/**
 * Extract file and folder entries from heterogeneous QNAP list responses.
 */
export function parseQnapEntries(resp: unknown): QnapEntry[] {
    if (!resp) return [];

    const candidates: unknown[] = [];
    const collectArrays = (obj: unknown) => {
        if (obj === null || obj === undefined) return;
        if (Array.isArray(obj)) {
            candidates.push(obj);
            return;
        }
        if (typeof obj !== 'object') return;
        const record = obj as Record<string, unknown>;
        for (const value of Object.values(record)) {
            collectArrays(value);
        }
    };
    collectArrays(resp);

    const getString = (obj: Record<string, unknown>, key: string) => {
        const value = obj[key];
        return typeof value === 'string' ? value : null;
    };

    const isFolderFlag = (obj: Record<string, unknown>) =>
        ['isFolder', 'isfolder', 'IsFolder', 'is_dir'].some(key => {
            const value = obj[key];
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string')
                return value.toLowerCase() === 'true';
            return false;
        });

    const entries: QnapEntry[] = [];

    for (const arr of candidates) {
        if (!Array.isArray(arr)) continue;
        for (const e of arr) {
            if (!e) continue;
            if (typeof e === 'string') {
                const n = e.trim();
                if (!n) continue;
                entries.push({ name: n, isFolder: false });
                continue;
            }
            if (typeof e !== 'object') continue;
            const asObj = e as Record<string, unknown>;
            const name =
                getString(asObj, 'name') ??
                getString(asObj, 'FileName') ??
                getString(asObj, 'fileName') ??
                getString(asObj, 'filename') ??
                getString(asObj, 'File');
            const isFolder = isFolderFlag(asObj);

            if (name && name.trim()) {
                const clean = name.trim();
                entries.push({ name: clean, isFolder });
                continue;
            }

            const displayName = getString(asObj, 'displayname');
            if (displayName) {
                const clean = displayName.trim();
                if (clean) {
                    entries.push({ name: clean, isFolder });
                }
            }
        }
    }

    return entries;
}

export function buildMovePlan(
    normalizedType: string,

    normalizedCondition: string,

    qcStep: number | undefined,

    baseQnapPath: string,

    employeeFolder: string,
): { sourcePath: string; destPath: string } | null {
    const type = normalizedType || '';

    const condition = normalizedCondition || 'fresh';

    if (type === 'general' || type === 'test') {
        if (condition === 'fresh') {
            return {
                sourcePath: joinPath(baseQnapPath, 'RAW'),

                destPath: joinPath(
                    baseQnapPath,

                    `PRODUCTION/PARTIALLY DONE/${employeeFolder}`,
                ),
            };
        }

        return {
            sourcePath: joinPath(baseQnapPath, 'PRODUCTION/PARTIALLY DONE'),

            destPath: joinPath(
                baseQnapPath,

                `PRODUCTION/PARTIALLY DONE/${employeeFolder}`,
            ),
        };
    }

    if (type.startsWith('qc')) {
        const step = Number(qcStep) || 1;

        if (condition === 'fresh') {
            if (step === 1) {
                return {
                    sourcePath: joinPath(
                        baseQnapPath,

                        `PRODUCTION/DONE/${employeeFolder}`,
                    ),

                    destPath: joinPath(
                        baseQnapPath,

                        `QC/QC1/PARTIALLY DONE/${employeeFolder}`,
                    ),
                };
            }

            return {
                sourcePath: joinPath(
                    baseQnapPath,

                    `QC/QC1/DONE/${employeeFolder}`,
                ),

                destPath: joinPath(
                    baseQnapPath,

                    `QC/QC2/PARTIALLY DONE/${employeeFolder}`,
                ),
            };
        }

        if (step === 1) {
            return {
                sourcePath: joinPath(baseQnapPath, 'QC/QC1/PARTIALLY DONE'),

                destPath: joinPath(
                    baseQnapPath,

                    `QC/QC1/PARTIALLY DONE/${employeeFolder}`,
                ),
            };
        }

        return {
            sourcePath: joinPath(baseQnapPath, 'QC/QC2/PARTIALLY DONE'),

            destPath: joinPath(
                baseQnapPath,

                `QC/QC2/PARTIALLY DONE/${employeeFolder}`,
            ),
        };
    }

    if (type.startsWith('correction')) {
        if (condition === 'fresh') {
            return {
                sourcePath: joinPath(baseQnapPath, 'FEEDBACK'),

                destPath: joinPath(
                    baseQnapPath,

                    `FEEDBACK/PARTIALLY DONE/${employeeFolder}`,
                ),
            };
        }

        return {
            sourcePath: joinPath(baseQnapPath, 'FEEDBACK/PARTIALLY DONE'),

            destPath: joinPath(
                baseQnapPath,

                `FEEDBACK/PARTIALLY DONE/${employeeFolder}`,
            ),
        };
    }

    // Fallback to production behaviour

    if (condition === 'fresh') {
        return {
            sourcePath: joinPath(baseQnapPath, 'RAW'),

            destPath: joinPath(
                baseQnapPath,

                `PRODUCTION/PARTIALLY DONE/${employeeFolder}`,
            ),
        };
    }

    return {
        sourcePath: joinPath(baseQnapPath, 'PRODUCTION/PARTIALLY DONE'),

        destPath: joinPath(
            baseQnapPath,

            `PRODUCTION/PARTIALLY DONE/${employeeFolder}`,
        ),
    };
}

export async function ensureFolderExists(
    qnapService: QnapService,

    fullPath: string,

    logger?: Logger,

    cache?: Set<string>,
): Promise<void> {
    const normalized = String(fullPath || '').replace(/\\+/g, '/');

    const parts = normalized.split('/').filter(Boolean);

    if (parts.length === 0) return;

    const seen = cache ?? new Set<string>();

    let current = '';

    for (const part of parts) {
        const parent = current ? `/${current}` : '/';

        const target = current ? `${current}/${part}` : part;

        if (seen.has(target)) {
            current = target;

            continue;
        }

        // Optimistic create; QNAP should no-op if folder exists. Log and continue on errors.

        try {
            await qnapService.createFolder(parent, part);
        } catch (err) {
            if (logger) {
                const msg = err instanceof Error ? err.message : String(err);

                logger.debug(`ensureFolderExists create skipped: ${msg}`);
            }
        }

        seen.add(target);

        current = target;
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function transferWithRetry(options: {
    qnapService: QnapService;

    sourcePath: string;

    items: string[];

    destPath: string;

    mode?: 0 | 1 | 2;

    logger?: Logger;

    retries?: number;

    delayMs?: number;

    operation?: 'move' | 'copy';
}): Promise<void> {
    const retries = options.retries ?? 2;

    const delayMs = options.delayMs ?? 300;

    const op = options.operation ?? 'move';

    let attempt = 0;

    for (;;) {
        try {
            if (op === 'copy') {
                await options.qnapService.copy(
                    options.sourcePath,

                    options.items,

                    options.destPath,

                    { mode: options.mode ?? 1 },
                );
            } else {
                await options.qnapService.move(
                    options.sourcePath,

                    options.items,

                    options.destPath,

                    options.mode ?? 1,
                );
            }

            return;
        } catch (err) {
            const status = err instanceof QnapApiError ? err.status : undefined;

            const retriable = status === 3 || status === 25;

            if (retriable && attempt < retries) {
                attempt += 1;

                if (options.logger) {
                    const msg =
                        err instanceof Error ? err.message : String(err);

                    options.logger.warn(
                        `${op} retry ${attempt}/${retries} (status=${status ?? 'n/a'}): ${msg}`,
                    );
                }

                await sleep(delayMs);

                continue;
            }

            throw err;
        }
    }
}

export async function moveFilesForNewJob(params: {
    folderPath: string;

    normalizedType: string;

    normalizedCondition: string;

    qcStep?: number;

    employeeName: string;

    fileNames: string[];

    driveMap?: string | null;

    qnapService: QnapService;

    logger?: Logger;
}): Promise<void> {
    if (!params.fileNames || params.fileNames.length === 0) return;

    const baseQnapPath = mapFolderPathToQnapPath(
        params.folderPath,

        params.driveMap || undefined,
    );

    if (!baseQnapPath) return;

    const employeeFolder = sanitizePathSegment(params.employeeName);

    const plan = buildMovePlan(
        params.normalizedType,

        params.normalizedCondition,

        params.qcStep,

        baseQnapPath,

        employeeFolder,
    );

    if (!plan) return;

    const shouldCopyFromRaw =
        params.normalizedCondition === 'fresh' &&
        (params.normalizedType === 'general' ||
            params.normalizedType === 'test');

    const ensureCache = new Set<string>();

    await ensureFolderExists(
        params.qnapService,

        plan.destPath,

        params.logger,

        ensureCache,
    );

    await transferWithRetry({
        qnapService: params.qnapService,

        sourcePath: plan.sourcePath,

        items: params.fileNames,

        destPath: plan.destPath,

        mode: 1,

        logger: params.logger,

        operation: shouldCopyFromRaw ? 'copy' : 'move',
    });
}

type JobTypeFilter = { orderType?: string; category?: string; isQc?: boolean };

export const mapJobTypeFilters = (
    jobType?: JobSelectionType,
): JobTypeFilter => {
    switch (jobType) {
        case 'general':
            return { orderType: 'general', category: 'production' };
        case 'test':
            return { orderType: 'test', category: 'production' };
        case 'qc_general':
            return { orderType: 'general', category: 'qc', isQc: true };
        case 'qc_test':
            return { orderType: 'test', category: 'qc', isQc: true };
        case 'correction_general':
            return {
                orderType: 'general',
                category: 'correction',
                isQc: false,
            };
        case 'correction_test':
            return { orderType: 'test', category: 'correction', isQc: false };
        default:
            return {};
    }
};

export const deriveJobType = (
    orderType: string,
    category: string,
): JobSelectionType => {
    if (category === 'qc') {
        return orderType === 'test' ? 'qc_test' : 'qc_general';
    }
    if (category === 'correction') {
        return orderType === 'test' ? 'correction_test' : 'correction_general';
    }
    return orderType === 'test' ? 'test' : 'general';
};
