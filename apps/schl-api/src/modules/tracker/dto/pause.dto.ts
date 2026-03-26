import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

    @IsString()
    @IsOptional()
    syncId?: string;
}
