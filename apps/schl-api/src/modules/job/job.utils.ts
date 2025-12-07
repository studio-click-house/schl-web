// Helper utilities for mapping and path building

import type { Logger } from '@nestjs/common';

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

export const sanitizePathSegment = (input: string): string => {
    const cleaned = String(input || '')
        .trim()

        .replace(/[\\/]+/g, '-')

        .replace(/\s+/g, ' ');

    return cleaned || 'employee';
};

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

async function moveWithRetry(options: {
    qnapService: QnapService;

    sourcePath: string;

    items: string[];

    destPath: string;

    mode?: 0 | 1 | 2;

    logger?: Logger;

    retries?: number;

    delayMs?: number;
}): Promise<void> {
    const retries = options.retries ?? 2;

    const delayMs = options.delayMs ?? 300;

    let attempt = 0;

    for (;;) {
        try {
            await options.qnapService.move(
                options.sourcePath,

                options.items,

                options.destPath,

                options.mode ?? 1,
            );

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
                        `move retry ${attempt}/${retries} (status=${status ?? 'n/a'}): ${msg}`,
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

    const ensureCache = new Set<string>();

    await ensureFolderExists(
        params.qnapService,

        plan.destPath,

        params.logger,

        ensureCache,
    );

    await moveWithRetry({
        qnapService: params.qnapService,

        sourcePath: plan.sourcePath,

        items: params.fileNames,

        destPath: plan.destPath,

        mode: 1,

        logger: params.logger,
    });
}
