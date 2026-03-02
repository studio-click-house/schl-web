import { WorkUpdate } from '@repo/common/models/work-update.schema';
import mongoose from 'mongoose';
import { CreateWorkUpdateBodyDto } from '../dto/create-work-update.dto';

export class WorkUpdateFactory {
    static fromCreateDto(
        dto: CreateWorkUpdateBodyDto,
        submittedBy: string,
    ): Partial<WorkUpdate> {
        const payload: Partial<WorkUpdate> = {
            message: dto.message.trim(),
            submitted_by: new mongoose.Types.ObjectId(submittedBy),
        };
        if (dto.ticket) {
            payload.ticket = new mongoose.Types.ObjectId(dto.ticket);
        }
        return payload;
    }

    static fromUpdateDto(dto: Partial<CreateWorkUpdateBodyDto>) {
        const patch: Partial<CreateWorkUpdateBodyDto> = {};
        if (dto.message !== undefined) {
            patch.message = dto.message.trim();
        }
        if (dto.ticket !== undefined) {
            patch.ticket = dto.ticket;
        }
        return patch;
    }
}
