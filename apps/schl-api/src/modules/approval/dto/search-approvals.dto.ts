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

export class SearchApprovalsQueryDto {
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

    // @IsOptional()
    // @Type(() => String)
    // @Transform(({ value }) => toBoolean(value, false))
    // @IsBoolean()
    // filtered: boolean = false;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    paginated: boolean = false;
}

export class SearchApprovalsBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    reqBy?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    reqType?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    approvedCheck?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    rejectedCheck?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    waitingCheck?: boolean;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    fromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string;
}
