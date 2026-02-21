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

type PauseReasonDto = {
    reason: string;
    duration: number;
};

class QcWorkLogFileDto {
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    timeSpent?: number;
}

export class SyncQcWorkLogDto {
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

    @IsNumber()
    @Min(0)
    @IsOptional()
    pauseCount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pauseTime?: number;

    @IsOptional()
    pauseReasons?: PauseReasonDto[];

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => QcWorkLogFileDto)
    files: QcWorkLogFileDto[];
}
