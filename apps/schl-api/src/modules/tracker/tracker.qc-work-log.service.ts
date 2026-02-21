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

            const bucketSet = TrackerFactory.qcBucketSetFromSyncDto(payload);

            await this.qcWorkLogModel.updateOne(
                filter,
                {
                    $setOnInsert: filter,
                    ...(Object.keys(bucketSet).length
                        ? { $set: bucketSet }
                        : {}),
                },
                { upsert: true },
            );

            if (Array.isArray(payload.files) && payload.files.length > 0) {
                for (const f of payload.files) {
                    const fileName = f.fileName?.trim() || '';
                    if (!fileName) continue;

                    const $set = TrackerFactory.qcFileSetFromSyncFileDto(f);
                    $set['files.$.file_status'] = payload.fileStatus;

                    const updateResult = await this.qcWorkLogModel.updateOne(
                        {
                            ...filter,
                            'files.file_name': fileName,
                        },
                        {
                            ...(Object.keys($set).length ? { $set } : {}),
                        },
                    );

                    if (updateResult.matchedCount === 0) {
                        const fileDoc = TrackerFactory.qcFileDocFromSyncFileDto(
                            fileName,
                            f,
                        );

                        fileDoc.file_status = payload.fileStatus;

                        await this.qcWorkLogModel.updateOne(
                            {
                                ...filter,
                                'files.file_name': {
                                    $ne: fileName,
                                },
                            },
                            { $push: { files: fileDoc } },
                        );
                    }
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
