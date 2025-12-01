import { IsOptional, IsString } from 'class-validator';

export class ListFilesQueryDto {
    @IsString()
    folderPath: string;

    @IsOptional()
    @IsString()
    jobType?: string;
}
