import {
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class UpdateShiftTemplateBodyDto {
    @IsOptional()
    @IsDateString(
        { strict: false },
        { message: 'From date must be a valid date' },
    )
    fromDate?: string;

    @IsOptional()
    @IsDateString(
        { strict: false },
        { message: 'To date must be a valid date' },
    )
    toDate?: string;

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
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
    changeReason?: string;
}
