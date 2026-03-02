import { DailyReport } from '@repo/common/models/daily-report.schema';
import mongoose from 'mongoose';
import { CreateDailyReportBodyDto } from '../dto/create-daily-report.dto';

export class DailyReportFactory {
    static fromCreateDto(
        dto: CreateDailyReportBodyDto,
        submittedBy: string,
    ): Partial<DailyReport> {
        const payload: Partial<DailyReport> = {
            message: dto.message.trim(),
            submitted_by: new mongoose.Types.ObjectId(submittedBy),
        };
        if (dto.ticket) {
            payload.ticket = new mongoose.Types.ObjectId(dto.ticket);
        }
        return payload;
    }

    static fromUpdateDto(dto: Partial<CreateDailyReportBodyDto>) {
        const patch: Partial<CreateDailyReportBodyDto> = {};
        if (dto.message !== undefined) {
            patch.message = dto.message.trim();
        }
        if (dto.ticket !== undefined) {
            patch.ticket = dto.ticket;
        }
        return patch;
    }
}
