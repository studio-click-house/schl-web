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
    dateFrom: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @IsMongoId()
    flagId?: string; // Optional: The AttendanceFlag ID (defaults to flag with code 'H' if omitted)

    @IsOptional()
    @IsString()
    comment?: string;
}

export class UpdateHolidayDto extends CreateHolidayDto {}
