import { Ticket } from '@repo/common/models/ticket.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import mongoose from 'mongoose';
import { CreateTicketBodyDto } from '../dto/create-ticket.dto';

export class TicketFactory {
    static fromCreateDto(
        dto: CreateTicketBodyDto,
        session: UserSession,
        ticketNumber: string,
    ) {
        return {
            ticket_number: ticketNumber,
            created_by: new mongoose.Types.ObjectId(session.db_id),
            title: dto.title.trim(),
            description: dto.description.trim(),
            type: dto.type,
            status: dto.status,
            priority: dto.priority,
            assignees: dto.assignees?.map(assignee => ({
                name: assignee.name,
                e_id: assignee.e_id,
                db_id: new mongoose.Types.ObjectId(assignee.db_id),
            })),
            assigned_by:
                dto.assignees && dto.assignees.length > 0
                    ? new mongoose.Types.ObjectId(session.db_id)
                    : null,
            deadline: dto.deadline ? new Date(dto.deadline) : null,
        };
    }

    static fromUpdateDto(dto: Partial<CreateTicketBodyDto>) {
        const patch: Partial<Ticket> = {};
        if (dto.title !== undefined) patch.title = dto.title.trim();
        if (dto.description !== undefined)
            patch.description = dto.description.trim();
        if (dto.type !== undefined) patch.type = dto.type;
        if (dto.status !== undefined) patch.status = dto.status;
        if (dto.priority !== undefined) patch.priority = dto.priority;
        if (dto.deadline !== undefined)
            patch.deadline = dto.deadline ? new Date(dto.deadline) : null;
        if (dto.assignees !== undefined) {
            patch.assignees = dto.assignees.map(a => ({
                name: a.name,
                e_id: a.e_id,
                db_id: new mongoose.Types.ObjectId(a.db_id),
            }));
        }
        return patch;
    }
}
