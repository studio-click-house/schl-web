import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportFileDto {
    @IsString()
    @IsNotEmpty()
    employeeName: string;

    @IsString()
    @IsOptional()
    workType?: string;

    @IsString()
    @IsOptional()
    shift?: string;

    @IsString()
    @IsOptional()
    clientCode?: string;

    @IsString()
    @IsOptional()
    folderPath?: string;

    @IsString()
    @IsNotEmpty()
    dateToday: string; // YYYY-MM-DD

    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsString()
    @IsNotEmpty()
    report: string;
}
