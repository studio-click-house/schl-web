import { Approval } from '@repo/common/models/approval.schema';
import mongoose from 'mongoose';
import { CreateApprovalBodyDto } from '../dto/create-approval.dto';

export class ApprovalFactory {
    static fromCreateDto(
        dto: CreateApprovalBodyDto,
        reqByUserId: string,
    ): Partial<Approval> {
        const payload: Partial<Approval> & { [key: string]: any } = {
            target_model: dto.target_model,
            action: dto.action,
            req_by: new mongoose.Types.ObjectId(reqByUserId),
        };

        if (dto.object_id) {
            payload.object_id = new mongoose.Types.ObjectId(dto.object_id);
        }
        if (dto.action === 'create') {
            payload.new_data = dto.new_data ?? null;
        }
        if (dto.action === 'update') {
            payload.changes = dto.changes ?? [];
        }
        if (dto.action === 'delete') {
            payload.deleted_data = dto.deleted_data ?? null;
        }

        return payload as Partial<Approval>;
    }
}
