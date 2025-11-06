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

export class SearchSchedulesBodyDto {
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
    receiveFromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    receiveToDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    deliveryFromDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    deliveryToDate?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
