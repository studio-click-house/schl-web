import {
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class CreateBulkShiftPlanBodyDto {
    @IsNotEmpty({ message: 'At least one employee ID is required' })
    @IsArray({ message: 'Employee IDs must be an array' })
    @IsString({ each: true, message: 'Each employee ID must be a string' })
    employeeIds: string[];

    @IsNotEmpty({ message: 'From date is required' })
    @IsDateString(
        { strict: false },
        { message: 'From date must be a valid date' },
    )
    fromDate: string; // Format: YYYY-MM-DD

    @IsNotEmpty({ message: 'To date is required' })
    @IsDateString(
        { strict: false },
        { message: 'To date must be a valid date' },
    )
    toDate: string; // Format: YYYY-MM-DD

    @IsNotEmpty({ message: 'Shift type is required' })
    @IsString()
    shiftType: 'morning' | 'evening' | 'night' | 'custom';

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift start time must be in HH:mm format',
    })
    shiftStart?: string; // Required for custom, auto-set for standard shifts

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/, {
        message: 'Shift end time must be in HH:mm format',
    })
    shiftEnd?: string; // Required for custom, auto-set for standard shifts

    @IsOptional()
    @IsString()
    changeReason?: string; // e.g., "Christmas special", "Eid break"
}
