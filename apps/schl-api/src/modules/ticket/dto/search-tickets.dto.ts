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
    fromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string;
}
