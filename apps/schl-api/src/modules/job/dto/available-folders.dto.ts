import {
    JOB_SELECTION_TYPES,
    type JobSelectionType,
} from '@repo/common/constants/order.constant';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AvailableFoldersQueryDto {
    @IsString()
    @IsIn(JOB_SELECTION_TYPES as readonly JobSelectionType[])
    jobType: JobSelectionType;

    @IsOptional()
    @IsString()
    clientCode?: string;
}
