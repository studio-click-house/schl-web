import {
    SHIFT_TYPES,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import {
    IsBoolean,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from 'class-validator';

export class CreateShiftDto {
    @IsNotEmpty()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    type: ShiftType;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:mm format (24-hour)',
    })
    startTime: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:mm format (24-hour)',
    })
    endTime: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(60)
    graceMinutes?: number;

    @IsOptional()
    @IsBoolean()
    crossesMidnight?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateShiftDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:mm format (24-hour)',
    })
    startTime?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:mm format (24-hour)',
    })
    endTime?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(60)
    graceMinutes?: number;

    @IsOptional()
    @IsBoolean()
    crossesMidnight?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
