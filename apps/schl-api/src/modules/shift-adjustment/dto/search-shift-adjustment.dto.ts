import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SearchShiftAdjustmentBodyDto {
    @IsOptional()
    @IsString()
    employeeId?: string;

    @IsOptional()
    @IsDateString(
        { strict: false },
        { message: 'From date must be a valid date' },
    )
    fromDate?: string; // Format: YYYY-MM-DD

    @IsOptional()
    @IsDateString(
        { strict: false },
        { message: 'To date must be a valid date' },
    )
    toDate?: string; // Format: YYYY-MM-DD

    @IsOptional()
    @IsString()
    adjustmentType?: 'replace' | 'cancel' | 'off_day';

    @IsOptional()
    @IsString()
    department?: string;

    @IsOptional()
    @IsString()
    active?: string; // 'true' or 'false'
}

export class SearchShiftAdjustmentQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    itemsPerPage?: string;

    @IsOptional()
    @IsString()
    paginated?: string; // 'true' or 'false'
}
