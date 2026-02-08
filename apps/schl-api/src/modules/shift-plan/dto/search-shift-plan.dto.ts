import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SearchShiftPlansBodyDto {
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
    shiftType?: 'morning' | 'evening' | 'night' | 'custom';

    @IsOptional()
    @IsString()
    active?: 'true' | 'false';
}

export class SearchShiftPlansQueryDto {
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
