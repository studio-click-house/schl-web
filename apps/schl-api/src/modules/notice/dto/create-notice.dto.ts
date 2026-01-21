import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import {
    ArrayMinSize,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateNoticeBodyDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one channel is required' })
    @IsIn([...EMPLOYEE_DEPARTMENTS], { each: true })
    channel: EmployeeDepartment[];

    @IsString()
    @IsNotEmpty()
    noticeNo: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsOptional()
    @IsString()
    fileName?: string | null;
}
