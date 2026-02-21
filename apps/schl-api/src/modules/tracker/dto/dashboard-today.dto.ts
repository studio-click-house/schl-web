import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DashboardTodayDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsOptional()
    date?: string; // YYYY-MM-DD
}
