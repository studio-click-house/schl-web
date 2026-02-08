import {
    IsBoolean,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class CreateShiftPlanBodyDto {
    @IsNotEmpty({ message: 'Employee ID is required' })
    @IsString({ message: 'Employee ID must be a string' })
    employeeId: string;

    @IsNotEmpty({ message: 'Shift date is required' })
    @IsDateString(
        { strict: false },
        { message: 'Shift date must be a valid date' },
    )
    shiftDate: string; // Format: YYYY-MM-DD

    @IsNotEmpty({ message: 'Shift type is required' })
    @IsString()
    shiftType: 'morning' | 'evening' | 'night' | 'custom';

    @IsNotEmpty({ message: 'Shift start time is required' })
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift start time must be in HH:mm format',
    })
    shiftStart: string; // Format: HH:mm

    @IsNotEmpty({ message: 'Shift end time is required' })
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift end time must be in HH:mm format',
    })
    shiftEnd: string; // Format: HH:mm

    @IsOptional()
    @IsBoolean()
    crossesMidnight?: boolean; // Will be auto-determined if not provided

    @IsOptional()
    @IsString()
    changeReason?: string; // e.g., "Christmas special", "Eid break"
}
