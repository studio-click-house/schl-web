import {
    FILE_CONDITIONS,
    JOB_SELECTION_TYPES,
    JOB_SHIFTS,
    type FileCondition,
    type JobSelectionType,
    type JobShift,
} from '@repo/common/constants/order.constant';
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class NewJobBodyDto {
    @IsString()
    @IsNotEmpty()
    clientCode: string;

    @IsString()
    @IsNotEmpty()
    folderPath: string;

    @IsArray()
    fileNames: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsIn(JOB_SELECTION_TYPES as readonly JobSelectionType[])
    jobType: string;

    @IsIn(JOB_SHIFTS as readonly JobShift[])
    shift: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(2)
    qcStep?: number;

    @IsIn(FILE_CONDITIONS as readonly FileCondition[])
    fileCondition: string;
}
