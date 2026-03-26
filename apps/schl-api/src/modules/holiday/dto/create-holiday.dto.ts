import { emptyStringToUndefined } from '@repo/common/utils/transformers';
import { Transform } from 'class-transformer';
import {
    IsDateString,
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

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    comment?: string;
}

export class UpdateHolidayDto extends CreateHolidayDto {}
