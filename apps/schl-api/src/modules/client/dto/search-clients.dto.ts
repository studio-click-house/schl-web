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

export class SearchClientsQueryDto {
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

export class SearchClientsBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    countryName?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    clientCode?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    contactPerson?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    marketerName?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    category?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
