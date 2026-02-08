import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class CreateShiftOverrideBodyDto {
    @IsNotEmpty({ message: 'Employee ID is required' })
    @IsString({ message: 'Employee ID must be a string' })
    employeeId: string;

    @IsNotEmpty({ message: 'Shift date is required' })
    @IsDateString(
        { strict: false },
        { message: 'Shift date must be a valid date' },
    )
    shiftDate: string; // Format: YYYY-MM-DD

    @IsNotEmpty({ message: 'Override type is required' })
    @IsString()
    overrideType: 'replace' | 'cancel';

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
    changeReason?: string; // e.g., "Eid special"
}
