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
import { TrackerGateway } from './tracker.gateway';

@Injectable()
export class TrackerReportService {
    constructor(
        @InjectModel(QcWorkLog.name)
        private readonly qcWorkLogModel: Model<QcWorkLog>,
        private readonly trackerGateway: TrackerGateway,
    ) {}

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

            this.trackerGateway.broadcastTrackerUpdate(
                'TRACKER_REPORT_UPDATED',
                {
                    employeeName: filter.employee_name,
                    fileName,
                    report,
                    timestamp: new Date().toISOString(),
                },
            );

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to save report');
        }
    }
}
