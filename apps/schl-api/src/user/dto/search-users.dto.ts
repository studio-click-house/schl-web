import { Expose, Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { toBoolean } from 'src/common/utils/transformers';

export class SearchUsersQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Expose({ name: 'items-per-page' })
    @Type(() => Number)
    @IsInt()
    @Min(30)
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

export class SearchUsersBodyDto {
    @IsOptional()
    @IsString()
    generalSearchString?: string;

    @IsOptional()
    @IsString()
    role?: string;
}
