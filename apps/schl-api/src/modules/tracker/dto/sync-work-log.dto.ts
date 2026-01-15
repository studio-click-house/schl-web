import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class SyncWorkLogDto {
    @IsString()
    @IsNotEmpty()
    employee_name: string;

    @IsString()
    @IsOptional()
    work_type?: string;

    @IsString()
    @IsOptional()
    shift?: string;

    @IsString()
    @IsOptional()
    client_code?: string;

    @IsString()
    @IsOptional()
    folder_path?: string;

    @IsString()
    @IsNotEmpty()
    file_name: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    time_spent?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pause_count?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pause_time?: number;

    @IsString()
    @IsOptional()
    categories?: string;

    @IsString()
    @IsNotEmpty()
    file_status: string;

    @IsDateString()
    @IsOptional()
    started_at?: string;

    @IsDateString()
    @IsOptional()
    completed_at?: string;
}

