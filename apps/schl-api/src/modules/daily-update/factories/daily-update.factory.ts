import { DailyUpdate } from '@repo/common/models/daily-update.schema';
import mongoose from 'mongoose';
import { CreateDailyUpdateBodyDto } from '../dto/create-daily-update.dto';

export class DailyUpdateFactory {
    static fromCreateDto(
        dto: CreateDailyUpdateBodyDto,
        submittedBy: string,
    ): Partial<DailyUpdate> {
        const payload: Partial<DailyUpdate> = {
            message: dto.message.trim(),
            submitted_by: new mongoose.Types.ObjectId(submittedBy),
        };
        if (dto.ticket) {
            payload.ticket = new mongoose.Types.ObjectId(dto.ticket);
        }
        return payload;
    }

    static fromUpdateDto(dto: Partial<CreateDailyUpdateBodyDto>) {
        const patch: Partial<CreateDailyUpdateBodyDto> = {};
        if (dto.message !== undefined) {
            patch.message = dto.message.trim();
        }
        if (dto.ticket !== undefined) {
            patch.ticket = dto.ticket;
        }
        return patch;
    }
}
