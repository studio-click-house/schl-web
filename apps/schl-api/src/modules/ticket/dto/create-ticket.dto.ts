import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TICKET_TYPES,
    type TicketPriority,
    type TicketStatus,
    type TicketType,
} from '@repo/common/constants/ticket.constant';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

const toLower = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value;

export class AssigneeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    e_id: string;

    @IsMongoId()
    @IsNotEmpty()
    db_id: string;
}

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

    @Transform(toLower)
    @IsIn(TICKET_STATUSES as readonly TicketStatus[])
    status?: TicketStatus;

    @Transform(toLower)
    @IsIn(TICKET_PRIORITIES as readonly TicketPriority[])
    priority?: TicketPriority;

    @IsOptional()
    @IsString()
    deadline?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssigneeDto)
    assignees?: AssigneeDto[];
}
