import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from 'class-validator';

export class CreateShiftAdjustmentBodyDto {
    @IsNotEmpty({ message: 'Employee ID is required' })
    @IsString({ message: 'Employee ID must be a string' })
    employeeId: string;

    @IsNotEmpty({ message: 'Shift date is required' })
    @IsDateString(
        { strict: false },
        { message: 'Shift date must be a valid date' },
    )
    shiftDate: string; // Format: YYYY-MM-DD

    @IsNotEmpty({ message: 'Adjustment type is required' })
    @IsString()
    adjustmentType: 'replace' | 'cancel' | 'off_day';

    @IsOptional()
    @IsString()
    shiftType?: 'morning' | 'evening' | 'night' | 'custom';

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift start time must be in HH:mm format',
    })
    shiftStart?: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift end time must be in HH:mm format',
    })
    shiftEnd?: string;

    @IsOptional()
    @IsString()
    comment?: string; // e.g., "Holiday adjustment"

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(120)
    gracePeriodMinutes?: number;
}
