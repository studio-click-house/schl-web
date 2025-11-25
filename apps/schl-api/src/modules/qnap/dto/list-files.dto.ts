import {
    QNAP_DIR,
    QNAP_SORT_FIELDS,
    type QnapDir,
    type QnapSortField,
} from '@repo/common/constants/qnap.constant';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ListFilesDto {
    @IsString()
    path: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    start?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsEnum(QNAP_SORT_FIELDS)
    sort?: QnapSortField;

    @IsOptional()
    @IsEnum(QNAP_DIR)
    dir?: QnapDir;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    hidden_file?: 0 | 1;
}
