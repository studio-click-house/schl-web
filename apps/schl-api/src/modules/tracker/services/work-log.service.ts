import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PauseSession } from '@repo/common/models/pause-session.schema';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { AnyBulkWriteOperation, FilterQuery, Model, Types } from 'mongoose';
import { WorkLogDto } from '../dto/work-log.dto';
import { TrackerFactory } from '../factories/tracker.factory';
import { TrackerGateway } from '../gateways/tracker.gateway';
import moment from 'moment-timezone';

@Injectable()
export class TrackerWorkLogService {
    private readonly logger = new Logger(TrackerWorkLogService.name);

    constructor(
        @InjectModel(WorkLog.name)
        private readonly workLogModel: Model<WorkLog>,
        @InjectModel(PauseSession.name)
        private readonly pauseSessionModel: Model<PauseSession>,
        private readonly trackerGateway: TrackerGateway,
    ) {}

    private decoratePauseReasons(doc: Record<string, any>): Array<{
        reason: string;
        duration: number;
        started_at: Date | null;
        completed_at: Date | null;
    }> {
        const now = Date.now();
        const reasons = Array.isArray(doc?.pause_reasons)
            ? doc.pause_reasons
            : [];
        return reasons.map((item: any) => {
            const startedAt = item?.started_at
                ? new Date(item.started_at as string | number | Date)
                : null;
            const completedAt = item?.completed_at
                ? new Date(item.completed_at as string | number | Date)
                : null;
            const liveDuration =
                !completedAt && startedAt
                    ? Math.max(
                          0,
                          Math.floor((now - startedAt.getTime()) / 1000),
                      )
                    : 0;

            return {
                reason: String(item?.reason || '').trim(),
                duration: completedAt
                    ? Math.max(0, Number(item?.duration) || 0)
                    : liveDuration,
                started_at: startedAt,
                completed_at: completedAt,
            };
        });
    }

    async sync(
        payload: WorkLogDto,
    ): Promise<{ success: true; deduped?: true } | { success: false }> {
        if (!payload.employeeName) {
            throw new BadRequestException('Missing employee name');
        }

        try {
            const dateString = moment().tz('Asia/Dhaka').format('YYYY-MM-DD');
            const requestedWorkLogId =
                typeof payload.workLogId === 'string'
                    ? payload.workLogId.trim()
                    : '';

            let filter: FilterQuery<WorkLog> | null = null;
            let allowUpsert = true;

            if (requestedWorkLogId && Types.ObjectId.isValid(requestedWorkLogId)) {
                const existingById = await this.workLogModel
                    .findById(requestedWorkLogId, { _id: 1 })
                    .lean();

                if (existingById?._id) {
                    filter = { _id: existingById._id } as FilterQuery<WorkLog>;
                    allowUpsert = false;
                }
            }

            if (!filter) {
                filter = TrackerFactory.qcFilterFromSyncDto(
                    payload,
                    dateString,
                ) as FilterQuery<WorkLog>;
            }

            // ── Idempotency check: skip $inc if syncId already processed ──
            const syncId =
                typeof payload.syncId === 'string' ? payload.syncId.trim() : '';

            if (syncId) {
                const existing = await this.workLogModel
                    .findOne(
                        { ...filter, processed_sync_ids: syncId },
                        { _id: 1 },
                    )
                    .lean();
                if (existing) {
                    return { success: true, deduped: true };
                }
            }

            // ── Bucket-level update (upsert) ──
            const bucketSet = TrackerFactory.qcBucketSetFromSyncDto(payload);
            // Server owns pause-reason lifecycle. Never overwrite history via $set.
            if ((bucketSet as any)?.pause_reasons !== undefined) {
                delete (bucketSet as any).pause_reasons;
            }
            const bucketMaxRaw = TrackerFactory.qcBucketMaxFromSyncDto();
            const bucketMax = { ...bucketMaxRaw };
            delete (bucketMax as any).pause_count;
            delete (bucketMax as any).pause_time;
            const bucketInc = TrackerFactory.qcBucketIncFromSyncDto(payload);

            const bucketUpdate: Record<string, any> = {};
            if (allowUpsert) {
                bucketUpdate.$setOnInsert = filter;
            }
            if (Object.keys(bucketSet).length)
                bucketUpdate.$set = {
                    ...(bucketSet || {}),
                };
            if (Object.keys(bucketMax).length) bucketUpdate.$max = bucketMax;
            if (Object.keys(bucketInc).length) bucketUpdate.$inc = bucketInc;

            // Record syncId (keep last 50 to prevent unbounded growth)
            if (syncId) {
                bucketUpdate.$push = {
                    processed_sync_ids: { $each: [syncId], $slice: -10 },
                };
            }

            const bucketDoc = await this.workLogModel
                .findOneAndUpdate(filter, bucketUpdate, {
                    upsert: allowUpsert,
                    new: true,
                })
                .lean();

            // ── Per-file updates (fast: push once, bulkWrite once) ──
            if (Array.isArray(payload.files) && payload.files.length > 0) {
                const now = new Date();
                const terminalStatuses = new Set(['done', 'skip', 'walkout']);

                const normalizeStatus = (value: unknown): string =>
                    String(value ?? '')
                        .toLowerCase()
                        .trim();

                const statusForFile = (f: any): string => {
                    const perFile = normalizeStatus(f?.fileStatus);
                    if (perFile) return perFile;
                    return normalizeStatus((payload as any)?.fileStatus);
                };

                // Existing file names from the findOneAndUpdate result — no extra query
                const rawFiles: Array<{ file_name?: string } | null> =
                    (bucketDoc as any)?.files ?? [];
                const existingNames = new Set<string>(
                    rawFiles
                        .filter((f): f is { file_name?: string } => f != null)
                        .map(f => String(f.file_name ?? '')),
                );

                // Step 1: Push ALL new files in ONE call ($push + $each)
                const newFileDocs = payload.files
                    .map(f => {
                        const fileName = f.fileName?.trim() || '';
                        if (!fileName || existingNames.has(fileName))
                            return null;
                        const fileDoc = TrackerFactory.qcFileDocFromSyncFileDto(
                            fileName,
                            f,
                        );
                        const statusLower = statusForFile(f);
                        fileDoc.file_status = statusLower || payload.fileStatus;
                        if (statusLower === 'working') {
                            fileDoc.started_at = now;
                        }
                        if (terminalStatuses.has(statusLower)) {
                            fileDoc.completed_at = now;
                        }
                        return fileDoc;
                    })
                    .filter((d): d is Record<string, any> => d !== null);

                if (newFileDocs.length > 0) {
                    await this.workLogModel.updateOne(filter, {
                        $push: { files: { $each: newFileDocs } },
                    });
                }

                // Step 2: bulkWrite to update status + $inc time_spent for all files at once
                const bulkOps: AnyBulkWriteOperation<WorkLog>[] = [];
                for (const f of payload.files) {
                    const fileName = f.fileName?.trim() || '';
                    if (!fileName) continue;

                    const $set: Record<string, any> =
                        TrackerFactory.qcFileSetFromSyncFileDto(f);
                    const statusLowerForFile = statusForFile(f);
                    // Important: do NOT overwrite every file's status to "paused".
                    // Pause is a session-level state; if we write paused into files.$.file_status,
                    // the DB loses the last known working file and the UI will drop the user
                    // from Production/QC/Client tabs.
                    if (statusLowerForFile !== 'paused') {
                        $set['files.$.file_status'] =
                            (f as any)?.fileStatus ?? payload.fileStatus;
                    }

                    const $inc = TrackerFactory.qcFileIncFromSyncFileDto(f);

                    const update: Record<string, any> = {};
                    if (Object.keys($set).length) update.$set = $set;
                    if (Object.keys($inc).length) update.$inc = $inc;

                    if (!Object.keys(update).length) continue;

                    bulkOps.push({
                        updateOne: {
                            filter: {
                                ...filter,
                                'files.file_name': fileName,
                            },
                            update,
                        },
                    });
                }

                // Step 3: set started_at / completed_at only if missing
                // (use $elemMatch so positional operator targets the correct file array element)
                for (const f of payload.files) {
                    const fileName = f.fileName?.trim() || '';
                    if (!fileName) continue;

                    const statusLowerForFile = statusForFile(f);

                    if (statusLowerForFile === 'working') {
                        bulkOps.push({
                            updateOne: {
                                filter: {
                                    ...filter,
                                    files: {
                                        $elemMatch: {
                                            file_name: fileName,
                                            started_at: { $exists: false },
                                        },
                                    },
                                },
                                update: {
                                    $set: {
                                        'files.$.started_at': now,
                                    },
                                },
                            },
                        });
                    }

                    if (terminalStatuses.has(statusLowerForFile)) {
                        bulkOps.push({
                            updateOne: {
                                filter: {
                                    ...filter,
                                    files: {
                                        $elemMatch: {
                                            file_name: fileName,
                                            completed_at: { $exists: false },
                                        },
                                    },
                                },
                                update: {
                                    $set: {
                                        'files.$.completed_at': now,
                                    },
                                },
                            },
                        });
                    }
                }

                if (bulkOps.length > 0) {
                    await this.workLogModel.bulkWrite(bulkOps, {
                        ordered: false,
                    });
                }
            }

            const statusTokensWorking = new Set([
                'working',
                'in_progress',
                'in progress',
                'in-progress',
                'inprogress',
            ]);

            const payloadStatus = String(payload.fileStatus ?? '')
                .trim()
                .toLowerCase();

            const employeeName = TrackerFactory.normalizeEmployeeName(
                payload.employeeName,
            );

            // Broadcast merged row via PARALLEL reads (work log + pause session)
            const [updatedDoc, pauseDocById, pauseDocByKey] = await Promise.all(
                [
                    this.workLogModel
                        .findOne(filter, {
                            _id: 1,
                            total_times: 1,
                            estimate_time: 1,
                            files: 1,
                            categories: 1,
                        })
                        .lean(),
                    (bucketDoc as any)?._id
                        ? this.pauseSessionModel
                              .findOne({
                                  work_log_id: (bucketDoc as any)._id,
                              } as FilterQuery<PauseSession>)
                              .lean()
                        : Promise.resolve(null),
                    this.pauseSessionModel
                        .findOne(filter as FilterQuery<PauseSession>)
                        .lean(),
                ],
            );
            const pauseDoc = pauseDocById || pauseDocByKey;

            const pauseReasons = pauseDoc
                ? this.decoratePauseReasons(pauseDoc as Record<string, any>)
                : [];
            const pauseTime = pauseReasons.reduce(
                (sum, item) => sum + Math.max(0, Number(item?.duration) || 0),
                0,
            );
            const pauseCount = pauseReasons.length;

            type AccFile = {
                fileName: string;
                fileStatus: string;
                timeSpent: number;
                startedAt: Date | null;
                completedAt: Date | null;
            };

            const accFiles: AccFile[] = (updatedDoc?.files ?? []).map(
                (f: any) => ({
                    fileName: String(f?.file_name ?? ''),
                    fileStatus: String(f?.file_status ?? ''),
                    timeSpent: Math.max(0, Number(f?.time_spent) || 0),
                    startedAt: f?.started_at ?? null,
                    completedAt: f?.completed_at ?? null,
                }),
            );

            const workingCount = accFiles.filter(f =>
                statusTokensWorking.has(
                    String(f?.fileStatus ?? '')
                        .trim()
                        .toLowerCase(),
                ),
            ).length;

            const computedStatus =
                payloadStatus === 'paused'
                    ? 'paused'
                    : workingCount > 0
                      ? 'working'
                      : payloadStatus;

            const emittedFiles: AccFile[] =
                payloadStatus === 'paused'
                    ? accFiles.map<AccFile>(f => {
                          const s = String(f.fileStatus ?? '')
                              .trim()
                              .toLowerCase();
                          if (statusTokensWorking.has(s)) {
                              return { ...f, fileStatus: 'paused' };
                          }
                          return f;
                      })
                    : accFiles;

            // Real-time broadcast (isolated to prevent 500 errors on successful DB writes)
            try {
                this.trackerGateway.broadcastTrackerUpdate('TRACKER_UPDATED', {
                    work_log_id: updatedDoc?._id ?? null,
                    employeeName,
                    clientCode: payload.clientCode,
                    workType: payload.workType,
                    shift: payload.shift,
                    folderPath: payload.folderPath,
                    fileStatus: computedStatus,
                    timestamp: new Date().toISOString(),
                    total_times: (updatedDoc as any)?.total_times ?? 0,
                    estimate_time: updatedDoc?.estimate_time ?? 0,
                    categories: (updatedDoc as any)?.categories ?? '',
                    pause_time: pauseTime,
                    pause_count: pauseCount,
                    pause_reasons: pauseReasons,
                    files: emittedFiles,
                });
            } catch (broadcastErr) {
                this.logger.error(
                    `Broadcast failed for ${employeeName} - ${payload.clientCode}:`,
                    broadcastErr,
                );
            }

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to sync qc work log',
            );
        }
    }
}
