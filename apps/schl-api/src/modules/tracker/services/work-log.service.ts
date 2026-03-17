import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { AnyBulkWriteOperation, FilterQuery, Model } from 'mongoose';
import { WorkLogDto } from '../dto/work-log.dto';
import { TrackerFactory } from '../factories/tracker.factory';
import { TrackerGateway } from '../gateways/tracker.gateway';
import moment from 'moment-timezone';
import { buildLiveTrackingDataPipeline } from '../aggregations/tracker.pipelines';

@Injectable()
export class TrackerWorkLogService {
    private readonly logger = new Logger(TrackerWorkLogService.name);

    constructor(
        @InjectModel(WorkLog.name)
        private readonly workLogModel: Model<WorkLog>,
        private readonly trackerGateway: TrackerGateway,
    ) {}

    async sync(
        payload: WorkLogDto,
    ): Promise<{ success: true; deduped?: true } | { success: false }> {
        if (!payload.employeeName) {
            throw new BadRequestException('Missing employee name');
        }

        try {
            const dateString = moment().tz('Asia/Dhaka').format('YYYY-MM-DD');

            const filter: FilterQuery<WorkLog> =
                TrackerFactory.qcFilterFromSyncDto(
                    payload,
                    dateString,
                ) as FilterQuery<WorkLog>;

            // ── Idempotency check: skip $inc if syncId already processed ──
            const syncId =
                typeof payload.syncId === 'string' ? payload.syncId.trim() : '';
            const skipInc = false;

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
            const bucketInc = skipInc
                ? {}
                : TrackerFactory.qcBucketIncFromSyncDto(payload);

            const bucketUpdate: Record<string, any> = {
                $setOnInsert: filter,
            };
            if (Object.keys(bucketSet).length)
                bucketUpdate.$set = {
                    ...(bucketSet || {}),
                };
            if (Object.keys(bucketMax).length) bucketUpdate.$max = bucketMax;
            if (Object.keys(bucketInc).length) bucketUpdate.$inc = bucketInc;

            // Record syncId (keep last 50 to prevent unbounded growth)
            if (syncId && !skipInc) {
                bucketUpdate.$push = {
                    processed_sync_ids: { $each: [syncId], $slice: -10 },
                };
            }

            await this.workLogModel.updateOne(filter, bucketUpdate, {
                upsert: true,
            });

            // ── Per-file updates (fast: read once, push once, bulkWrite once) ──
            if (Array.isArray(payload.files) && payload.files.length > 0) {
                const now = new Date();

                // Step 1: Read existing file names in ONE query
                const existingDoc = await this.workLogModel
                    .findOne(filter, { 'files.file_name': 1 })
                    .lean();
                const existingNames = new Set<string>(
                    (existingDoc?.files ?? []).map(
                        (f: any) => f.file_name as string,
                    ),
                );

                // Step 2: Push ALL new files in ONE call ($push + $each)
                const newFileDocs = payload.files
                    .map(f => {
                        const fileName = f.fileName?.trim() || '';
                        if (!fileName || existingNames.has(fileName))
                            return null;
                        const fileDoc = TrackerFactory.qcFileDocFromSyncFileDto(
                            fileName,
                            f,
                        );
                        fileDoc.file_status = payload.fileStatus;
                        if (
                            String(payload.fileStatus || '')
                                .toLowerCase()
                                .trim() === 'working'
                        ) {
                            fileDoc.started_at = now;
                        }
                        if (
                            ['done', 'skip'].includes(
                                String(payload.fileStatus || '')
                                    .toLowerCase()
                                    .trim(),
                            )
                        ) {
                            fileDoc.completed_at = now;
                        }
                        if (skipInc) fileDoc.time_spent = 0;
                        return fileDoc;
                    })
                    .filter((d): d is Record<string, any> => d !== null);

                if (newFileDocs.length > 0) {
                    await this.workLogModel.updateOne(filter, {
                        $push: { files: { $each: newFileDocs } },
                    });
                }

                // Step 3: bulkWrite to update status + $inc time_spent for all files at once
                const bulkOps: AnyBulkWriteOperation<WorkLog>[] = [];
                for (const f of payload.files) {
                    const fileName = f.fileName?.trim() || '';
                    if (!fileName) continue;

                    const $set: Record<string, any> =
                        TrackerFactory.qcFileSetFromSyncFileDto(f);
                    const statusLowerForFile = String(payload.fileStatus || '')
                        .toLowerCase()
                        .trim();
                    // Important: do NOT overwrite every file's status to "paused".
                    // Pause is a session-level state; if we write paused into files.$.file_status,
                    // the DB loses the last known working file and the UI will drop the user
                    // from Production/QC/Client tabs.
                    if (statusLowerForFile !== 'paused') {
                        $set['files.$.file_status'] = payload.fileStatus;
                    }

                    const $inc = skipInc
                        ? {}
                        : TrackerFactory.qcFileIncFromSyncFileDto(f);

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

                // Step 4: set started_at / completed_at only if missing
                // (use $elemMatch so positional operator targets the correct file array element)
                const statusLower = String(payload.fileStatus || '')
                    .toLowerCase()
                    .trim();
                const needsStartedAt = statusLower === 'working';
                const needsCompletedAt = ['done', 'skip'].includes(statusLower);

                if (needsStartedAt) {
                    for (const f of payload.files) {
                        const fileName = f.fileName?.trim() || '';
                        if (!fileName) continue;
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
                }

                if (needsCompletedAt) {
                    for (const f of payload.files) {
                        const fileName = f.fileName?.trim() || '';
                        if (!fileName) continue;
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

            // Preferred: broadcast full merged row via MongoDB pipeline
            try {
                const pipelineFilter = filter as FilterQuery<WorkLog> & {
                    updatedAt?: { $gte: Date };
                };
                const rows = await this.workLogModel
                    .aggregate(buildLiveTrackingDataPipeline(pipelineFilter))
                    .exec();
                const mergedRow = rows?.[0] as Record<string, any> | undefined;
                if (mergedRow) {
                    const rawFiles: Array<Record<string, any>> = Array.isArray(
                        mergedRow?.files,
                    )
                        ? (mergedRow.files as Array<Record<string, any>>)
                        : [];
                    const workingCount = rawFiles.filter((f: any) =>
                        statusTokensWorking.has(
                            String(f?.file_status ?? f?.fileStatus ?? '')
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

                    const maskedFiles =
                        payloadStatus === 'paused'
                            ? rawFiles.map((f: any) => {
                                  const s = String(
                                      f?.file_status ?? f?.fileStatus ?? '',
                                  )
                                      .trim()
                                      .toLowerCase();
                                  if (statusTokensWorking.has(s)) {
                                      return {
                                          ...f,
                                          file_status: 'paused',
                                          fileStatus: 'paused',
                                      } as Record<string, any>;
                                  }
                                  return f as Record<string, any>;
                              })
                            : rawFiles;

                    this.trackerGateway.broadcastTrackerUpdate(
                        'TRACKER_UPDATED',
                        {
                            ...mergedRow,
                            employeeName,
                            clientCode: payload.clientCode,
                            workType: payload.workType,
                            shift: payload.shift,
                            folderPath: payload.folderPath,
                            fileStatus: computedStatus,
                            timestamp: new Date().toISOString(),
                            files: maskedFiles,
                        },
                    );

                    return { success: true };
                }
            } catch {
                // fall back below
            }

            // Fallback: broadcast real-time delta with accumulated totals from DB
            const updatedDoc = await this.workLogModel
                .findOne(filter, {
                    total_times: 1,
                    estimate_time: 1,
                    files: 1,
                    categories: 1,
                })
                .lean();

            const accFiles = (updatedDoc?.files ?? []).map((f: any) => ({
                fileName: f.file_name,
                fileStatus: f.file_status,
                timeSpent: f.time_spent ?? 0,
                startedAt: f.started_at ?? null,
                completedAt: f.completed_at ?? null,
            }));

            const workingCount = accFiles.filter(f =>
                statusTokensWorking.has(
                    String((f as any)?.fileStatus ?? '')
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

            const emittedFiles =
                payloadStatus === 'paused'
                    ? accFiles.map(f => {
                          const s = String((f as any)?.fileStatus ?? '')
                              .trim()
                              .toLowerCase();
                          if (statusTokensWorking.has(s)) {
                              return { ...f, fileStatus: 'paused' };
                          }
                          return f;
                      })
                    : accFiles;

            this.trackerGateway.broadcastTrackerUpdate('TRACKER_UPDATED', {
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
                files: emittedFiles,
            });

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to sync qc work log',
            );
        }
    }
}
