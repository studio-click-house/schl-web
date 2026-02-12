import {
    LEAVE_TYPES,
    type LeaveType,
} from '@repo/common/constants/leave.constant';
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

export class SearchLeavesQueryDto {
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

export class SearchLeavesBodyDto {
    @IsOptional()
    @IsString()
    employeeId?: string;

    @IsOptional()
    @IsString()
    fromDate?: string;

    @IsOptional()
    @IsString()
    toDate?: string;

    // frontend sends boolean for isPaid; accept and coerce booleans/strings
    @IsOptional()
    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    isPaid?: boolean;

    @IsOptional()
    @IsString()
    leaveType?: LeaveType;

    @IsOptional()
    @IsString()
    status?: string;
}
