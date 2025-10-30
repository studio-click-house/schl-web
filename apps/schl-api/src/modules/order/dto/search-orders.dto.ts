import { toBoolean } from '@repo/common/utils/transformers';
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

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    filtered: boolean = false;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    paginated: boolean = false;
}

export class SearchOrdersBodyDto {
    @IsOptional()
    @IsString()
    clientCode?: string;

    @IsOptional()
    @IsString()
    task?: string;

    @IsOptional()
    @IsString()
    folder?: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    fromDate?: string;

    @IsOptional()
    @IsString()
    toDate?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    invoice: boolean = false;

    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
