import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TICKET_TYPES,
    type TicketPriority,
    type TicketStatus,
    type TicketType,
} from '@repo/common/constants/ticket.constant';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

const toLower = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value;

export class CreateCommitBodyDto {
    @Transform(trimString)
    @IsOptional()
    @IsString()
    sha?: string;

    @Transform(trimString)
    @IsString()
    @IsNotEmpty()
    message: string;

    @Transform(trimString)
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Transform(toLower)
    @IsIn(TICKET_TYPES as readonly TicketType[])
    type?: TicketType;

    @IsOptional()
    @Transform(toLower)
    @IsIn(TICKET_STATUSES as readonly TicketStatus[])
    status?: TicketStatus;

    @IsOptional()
    @Transform(toLower)
    @IsIn(TICKET_PRIORITIES as readonly TicketPriority[])
    priority?: TicketPriority;
}
