import {
    emptyStringToUndefined,
    toBoolean,
} from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class SearchTicketsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    itemsPerPage: number = 30;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    paginated: boolean = false;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    myTickets: boolean = false;
}

export class SearchTicketsBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    ticketNumber?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    title?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    type?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    status?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    priority?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    fromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string;

    // filter tickets by deadline crossing status: 'overdue' | 'not-overdue'
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    deadlineStatus?: 'overdue' | 'not-overdue';

    // filter by creator user id
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    createdBy?: string;

    // multi-select for assigned users; ticket matches if any of the selected
    // user ids appear in its assignees array.
    @Transform(({ value }) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value !== '') return [value];
        return undefined;
    })
    @IsOptional()
    @IsString({ each: true })
    assignees?: string[];

    // when true, matching tickets will also include those with no assignees
    @Transform(({ value }) => toBoolean(value, false))
    @IsOptional()
    @IsBoolean()
    includeUnassigned?: boolean;

    // when true, excludes tickets whose status is in CLOSED_TICKET_STATUSES
    @Transform(({ value }) => toBoolean(value, false))
    @IsOptional()
    @IsBoolean()
    excludeClosed?: boolean;
}
