import { type JobSelectionType } from '@repo/common/constants/order.constant';
import { IsOptional, IsString } from 'class-validator';

export class AvailableOrdersQueryDto {
    @IsString()
    jobType: JobSelectionType;

    @IsOptional()
    @IsString()
    clientCode?: string;
}
