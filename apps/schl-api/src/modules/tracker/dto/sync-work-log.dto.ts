import {
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
    fileName: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    timeSpent?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pauseCount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pauseTime?: number;

    @IsString()
    @IsOptional()
    categories?: string;

    @IsString()
    @IsNotEmpty()
    fileStatus: string;

    @IsDateString()
    @IsOptional()
    startedAt?: string;

    @IsDateString()
    @IsOptional()
    completedAt?: string;
}
