import {
    JOB_SELECTION_TYPES,
    type FileStatus,
    type JobSelectionType,
} from '@repo/common/constants/order.constant';
import {
    emptyStringToUndefined,
    toBoolean,
} from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export const ACTIVE_FILE_STATUSES = [
    'working',
    'paused',
    'transferred',
] as const;
export type ActiveFileStatus = (typeof ACTIVE_FILE_STATUSES)[number];

export class SearchJobsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    itemsPerPage: number = 30;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, true))
    @IsBoolean()
    paginated: boolean = true;
}

export class SearchJobsBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    folder?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    folderPath?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    @IsIn(ACTIVE_FILE_STATUSES as readonly FileStatus[])
    fileStatus?: FileStatus;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    @IsIn(JOB_SELECTION_TYPES as readonly JobSelectionType[])
    jobType?: JobSelectionType;
}
