import { IsOptional, IsString } from 'class-validator';

export class DashboardTodayDto {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    date?: string; // YYYY-MM-DD

    @IsString()
    @IsOptional()
    dateFrom?: string; // YYYY-MM-DD

    @IsString()
    @IsOptional()
    dateTo?: string; // YYYY-MM-DD
}
