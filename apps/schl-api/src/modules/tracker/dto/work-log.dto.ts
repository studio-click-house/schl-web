import {
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WorkLogFileDto {
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsString()
    @IsOptional()
    filePath?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    timeSpent?: number;
}

export class WorkLogDto {
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

    @IsNumber()
    @Min(0)
    @IsOptional()
    estimateTime?: number;

    @IsString()
    @IsOptional()
    categories?: string;

    @IsString()
    @IsNotEmpty()
    fileStatus: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    totalTimes?: number;

    @IsString()
    @IsOptional()
    syncId?: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => WorkLogFileDto)
    files: WorkLogFileDto[];
}
