import {
    IsBoolean,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from 'class-validator';

export class UpdateShiftAdjustmentBodyDto {
    @IsOptional()
    @IsDateString(
        { strict: false },
        { message: 'Shift date must be a valid date' },
    )
    shiftDate?: string;

    @IsOptional()
    @IsString()
    adjustmentType?: 'replace' | 'cancel' | 'off_day';

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
    comment?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(120)
    gracePeriodMinutes?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
