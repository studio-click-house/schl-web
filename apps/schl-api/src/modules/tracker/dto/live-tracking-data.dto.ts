import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LiveTrackingDataDto {
    @IsOptional()
    @IsString()
    dateToday?: string;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional()
    @IsNumber()
    hours?: number;
}
