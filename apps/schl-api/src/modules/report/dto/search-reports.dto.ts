import {
    emptyStringToUndefined,
    toBoolean,
} from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class SearchReportsQueryDto {
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

export class SearchReportsBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    country?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    companyName?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    category?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    marketerName?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    fromDate?: string; // YYYY-MM-DD

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string; // YYYY-MM-DD

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    test?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    prospect?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    onlyLead?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    followupDone?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    regularClient?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    staleClient?: boolean;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    prospectStatus?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    generalSearchString?: string;

    // marketer specific filters
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    leadOrigin?: string; // 'generated' or other (non-generated)

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    @IsEnum(['all', 'others', 'mine'])
    show?: string; // 'all' | 'others' | 'mine'

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, undefined))
    @IsBoolean()
    freshLead?: boolean; // when true, lead_withdrawn = false
}
