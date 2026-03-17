import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class PauseDto {
    @IsString()
    @IsNotEmpty()
    employeeName: string;

    @IsString()
    @IsNotEmpty()
    status: string;

    @IsString()
    @IsOptional()
    reason?: string;

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
    totalTimes?: number;

    @IsString()
    @IsOptional()
    syncId?: string;
}
