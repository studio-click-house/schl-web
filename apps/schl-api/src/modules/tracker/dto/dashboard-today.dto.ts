import { IsOptional, IsString } from 'class-validator';

export class DashboardTodayDto {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsOptional()
    date?: string; // YYYY-MM-DD
}
