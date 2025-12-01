import {
    ORDER_PRIORITIES,
    ORDER_STATUSES,
    ORDER_TYPES,
    type OrderPriority,
    type OrderStatus,
    type OrderType,
} from '@repo/common/constants/order.constant';
import { Transform, Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

const toLower = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value;

import {
    FILE_STATUSES,
    type FileStatus,
    JOB_SHIFTS,
    type JobShift,
    WORK_CATEGORIES,
    type WorkCategory,
} from '@repo/common/constants/order.constant';

export class FilesTrackingDto {
    @IsString()
    file_name: string;

    @IsOptional()
    start_timestamp?: string | Date;

    @IsOptional()
    end_timestamp?: string | Date | null;

    @IsOptional()
    @IsOptional()
    @IsIn(FILE_STATUSES as readonly FileStatus[])
    status?: FileStatus;

    @IsOptional()
    @Type(() => Number)
    total_pause_duration?: number;

    @IsOptional()
    pause_start_timestamp?: string | Date | null;

    @IsOptional()
    @IsString()
    transferred_from?: string | null;
}

export class ProgressDto {
    @IsString()
    employee: string;

    @IsIn(JOB_SHIFTS as readonly JobShift[])
    @Transform(toLower)
    shift: JobShift;

    @IsOptional()
    @Transform(toLower)
    @IsIn(WORK_CATEGORIES as readonly WorkCategory[])
    category?: WorkCategory;

    @IsOptional()
    is_qc?: boolean;

    @IsOptional()
    @Type(() => Number)
    qc_step?: number | null;

    @IsOptional()
    @Type(() => FilesTrackingDto)
    files_tracking?: FilesTrackingDto[];
}

export class CreateOrderBodyDto {
    @IsString()
    @IsNotEmpty()
    clientCode: string;

    @IsString()
    @IsNotEmpty()
    clientName: string;

    @IsOptional()
    @IsString()
    folder?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    rate?: number | null;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(1000000)
    quantity?: number;

    @IsNotEmpty()
    @IsString()
    downloadDate: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    deliveryDate?: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    deliveryBdTime?: string; // HH:mm or custom

    @IsNotEmpty()
    @IsString()
    task: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    et?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    production?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    qc1?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    qc2?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @Transform(toLower)
    @IsIn(ORDER_TYPES as readonly OrderType[])
    type?: OrderType;

    @IsOptional()
    @Transform(toLower)
    @IsIn(ORDER_STATUSES as readonly OrderStatus[])
    status?: OrderStatus;

    @IsOptional()
    @IsString()
    folderPath?: string;

    // Progress entries which may include file-level tracking
    @IsOptional()
    @Type(() => ProgressDto)
    progress?: ProgressDto[];

    @IsOptional()
    @Transform(toLower)
    @IsIn(ORDER_PRIORITIES as readonly OrderPriority[])
    priority?: OrderPriority;
}
