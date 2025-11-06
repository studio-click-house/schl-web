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

export class SearchNoticesQueryDto {
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

export class SearchNoticesBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    channel?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    title?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    noticeNo?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    fromDate?: string; // YYYY-MM-DD

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string; // YYYY-MM-DD
}
