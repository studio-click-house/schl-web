import {
    IsBoolean,
    IsDateString,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateHolidayDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsMongoId()
    @IsNotEmpty()
    flagId: string; // The AttendanceFlag ID

    @IsOptional()
    @IsBoolean()
    recurring?: boolean;
}

export class UpdateHolidayDto extends CreateHolidayDto {}
