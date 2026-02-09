import {
    IsBoolean,
    IsHexColor,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateAttendanceFlagDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsHexColor()
    @IsNotEmpty()
    color: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    ignore_attendance_hours?: boolean;

    @IsOptional()
    @IsBoolean()
    is_payable?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    deduction_percent?: number;
}

export class UpdateAttendanceFlagDto extends CreateAttendanceFlagDto {}
