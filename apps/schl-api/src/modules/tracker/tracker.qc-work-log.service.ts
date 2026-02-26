import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QcWorkLog } from '@repo/common/models/qc-work-log.schema';
import { Model } from 'mongoose';
import { ReportFileDto } from './dto/report-file.dto';
import { SyncQcWorkLogDto } from './dto/sync-qc-work-log.dto';
import { TrackerFactory } from './factories/tracker.factory';

@Injectable()
export class TrackerQcWorkLogService {
    constructor(
        @InjectModel(QcWorkLog.name)
        private readonly qcWorkLogModel: Model<QcWorkLog>,
    ) {}

    async syncQc(payload: SyncQcWorkLogDto) {
        if (!payload.employeeName) {
            throw new BadRequestException('Missing employee name');
        }

        try {
            const dateString = new Date().toISOString().split('T')[0] as string;

            const filter = TrackerFactory.qcFilterFromSyncDto(
                payload,
                dateString,
            );

            // ── Idempotency check: skip $inc if syncId already processed ──
            const syncId =
                typeof payload.syncId === 'string' ? payload.syncId.trim() : '';
            let skipInc = false;

            if (syncId) {
                const existing = await this.qcWorkLogModel
                    .findOne(
                        { ...filter, processed_sync_ids: syncId },
                        { _id: 1 },
                    )
                    .lean();
                if (existing) {
                    skipInc = true;
                }
            }

            // ── Bucket-level update (upsert) ──
            const bucketSet = TrackerFactory.qcBucketSetFromSyncDto(payload);
            const bucketMax = TrackerFactory.qcBucketMaxFromSyncDto(payload);
            const bucketInc = skipInc
                ? {}
                : TrackerFactory.qcBucketIncFromSyncDto(payload);

            if (
                typeof payload.fileStatus === 'string' &&
                payload.fileStatus.toLowerCase() === 'paused'
            ) {
                delete bucketSet.pause_reasons;
            }

            const bucketUpdate: Record<string, any> = {
                $setOnInsert: filter,
            };
            if (Object.keys(bucketSet).length) bucketUpdate.$set = bucketSet;
            if (Object.keys(bucketMax).length) bucketUpdate.$max = bucketMax;
            if (Object.keys(bucketInc).length) bucketUpdate.$inc = bucketInc;

            // Record syncId (keep last 50 to prevent unbounded growth)
            if (syncId && !skipInc) {
                bucketUpdate.$push = {
                    processed_sync_ids: { $each: [syncId], $slice: -10 },
                };
            }

            await this.qcWorkLogModel.updateOne(filter, bucketUpdate, {
                upsert: true,
            });

            // ── Per-file updates (fast: read once, push once, bulkWrite once) ──
            if (Array.isArray(payload.files) && payload.files.length > 0) {
                // Step 1: Read existing file names in ONE query
                const existingDoc = await this.qcWorkLogModel
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
                        if (skipInc) fileDoc.time_spent = 0;
                        return fileDoc;
                    })
                    .filter((d): d is Record<string, any> => d !== null);

                if (newFileDocs.length > 0) {
                    await this.qcWorkLogModel.updateOne(filter, {
                        $push: { files: { $each: newFileDocs } },
                    });
                }

                // Step 3: bulkWrite to update status + $inc time_spent for all files at once
                const bulkOps = payload.files
                    .map(f => {
                        const fileName = f.fileName?.trim() || '';
                        if (!fileName) return null;

                        const $set: Record<string, any> =
                            TrackerFactory.qcFileSetFromSyncFileDto(f);
                        $set['files.$.file_status'] = payload.fileStatus;

                        const $inc = skipInc
                            ? {}
                            : TrackerFactory.qcFileIncFromSyncFileDto(f);

                        const update: Record<string, any> = {};
                        if (Object.keys($set).length) update.$set = $set;
                        if (Object.keys($inc).length) update.$inc = $inc;

                        if (!Object.keys(update).length) return null;

                        return {
                            updateOne: {
                                filter: {
                                    ...filter,
                                    'files.file_name': fileName,
                                },
                                update,
                            },
                        };
                    })
                    .filter(Boolean);

                if (bulkOps.length > 0) {
                    await this.qcWorkLogModel.bulkWrite(bulkOps as any[], {
                        ordered: false,
                    });
                }
            }

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to sync qc work log',
            );
        }
    }

    async reportFile(dto: ReportFileDto) {
        if (!dto?.employeeName || !dto.employeeName.trim()) {
            throw new BadRequestException('Missing employee name');
        }
        if (!dto?.dateToday || !dto.dateToday.trim()) {
            throw new BadRequestException('Missing date');
        }
        if (!dto?.fileName || !dto.fileName.trim()) {
            throw new BadRequestException('Missing file name');
        }

        try {
            const filter = {
                employee_name: dto.employeeName.toLowerCase(),
                client_code: (dto.clientCode || 'unknown_client').toLowerCase(),
                folder_path: (dto.folderPath || 'unknown_folder').trim(),
                shift: (dto.shift || 'unknown_shift').toLowerCase(),
                work_type: (dto.workType || 'qc').toLowerCase(),
                date_today: dto.dateToday.trim(),
            };

            const fileName = dto.fileName.trim();
            const report = (dto.report ?? '').trim();

            const updateResult = await this.qcWorkLogModel.updateOne(
                {
                    ...filter,
                    'files.file_name': fileName,
                },
                {
                    $set: {
                        'files.$.report': report,
                    },
                },
            );

            if (updateResult.matchedCount === 0) {
                return { success: false };
            }

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to save report');
        }
    }
}
