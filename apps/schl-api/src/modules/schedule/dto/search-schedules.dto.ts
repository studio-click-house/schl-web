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

export class SearchSchedulesQueryDto {
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

export class SearchSchedulesBodyDto {
    @IsOptional()
    @IsString()
    clientCode?: string;

    @IsOptional()
    @IsString()
    task?: string;

    @IsOptional()
    @IsString()
    receiveFromDate?: string;

    @IsOptional()
    @IsString()
    receiveToDate?: string;

    @IsOptional()
    @IsString()
    deliveryFromDate?: string;

    @IsOptional()
    @IsString()
    deliveryToDate?: string;

    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
