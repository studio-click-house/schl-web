import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TICKET_TYPES,
    type TicketPriority,
    type TicketStatus,
    type TicketType,
} from '@repo/common/constants/ticket.constant';
import { Transform } from 'class-transformer';
import {
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

const toLower = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value;

export class CreateTicketBodyDto {
    @Transform(trimString)
    @IsString()
    @IsNotEmpty()
    title: string;

    @Transform(trimString)
    @IsString()
    @IsNotEmpty()
    description: string;

    @Transform(toLower)
    @IsIn(TICKET_TYPES as readonly TicketType[])
    type: TicketType;

    @IsOptional()
    @Transform(toLower)
    @IsIn(TICKET_STATUSES as readonly TicketStatus[])
    status?: TicketStatus;

    @IsOptional()
    @Transform(toLower)
    @IsIn(TICKET_PRIORITIES as readonly TicketPriority[])
    priority?: TicketPriority;
}
