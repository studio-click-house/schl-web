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

export class SearchOrdersQueryDto {
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

export class SearchOrdersBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    clientCode?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    task?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    folder?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    type?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    fromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    toDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    invoice: boolean = false;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
