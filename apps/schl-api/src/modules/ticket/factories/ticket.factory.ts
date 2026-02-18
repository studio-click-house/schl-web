import { Ticket } from '@repo/common/models/ticket.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import mongoose from 'mongoose';
import { CreateTicketBodyDto } from '../dto/create-ticket.dto';

export class TicketFactory {
    private static normalizeTags(tags: unknown): string[] {
        if (Array.isArray(tags)) {
            return tags
                .map(tag => String(tag).trim())
                .filter(tag => tag.length > 0);
        }

        if (typeof tags === 'string') {
            return tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
        }

        return [];
    }

    static fromCreateDto(
        dto: CreateTicketBodyDto,
        session: UserSession,
        ticketNumber: string,
    ): Partial<Ticket> {
        return {
            ticket_number: ticketNumber,
            opened_by: new mongoose.Types.ObjectId(session.db_id),
            title: dto.title.trim(),
            description: dto.description.trim(),
            type: dto.type,
            status: dto.status ?? 'new',
            tags: TicketFactory.normalizeTags(dto.tags),
            checked_by: null,
        };
    }

    static fromUpdateDto(dto: Partial<CreateTicketBodyDto>): Partial<Ticket> {
        const patch: Partial<Ticket> = {};
        if (dto.title !== undefined) patch.title = dto.title.trim();
        if (dto.description !== undefined)
            patch.description = dto.description.trim();
        if (dto.type !== undefined) patch.type = dto.type;
        if (dto.status !== undefined) patch.status = dto.status;
        if (dto.tags !== undefined)
            patch.tags = TicketFactory.normalizeTags(dto.tags);
        return patch;
    }
}
