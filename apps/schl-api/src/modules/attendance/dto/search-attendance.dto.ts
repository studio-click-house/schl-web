import { toBoolean } from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class SearchAttendanceQueryDto {
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
    @Transform(({ value }) => toBoolean(value, true))
    @IsBoolean()
    paginated: boolean = true;
}

export class SearchAttendanceBodyDto {
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    @IsOptional()
    @IsString()
    fromDate?: string;

    @IsOptional()
    @IsString()
    toDate?: string;
}
