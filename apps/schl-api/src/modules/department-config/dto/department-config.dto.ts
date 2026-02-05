import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import type { WeekDay } from '@repo/common/constants/shift.constant';
import { WEEK_DAYS } from '@repo/common/constants/shift.constant';
import { Transform } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsIn,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateDepartmentConfigDto {
    @IsIn(EMPLOYEE_DEPARTMENTS)
    department: EmployeeDepartment;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    @IsIn(WEEK_DAYS, { each: true })
    weekendDays?: WeekDay[];
}

export class UpdateDepartmentConfigDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayUnique()
    @IsIn(WEEK_DAYS, { each: true })
    weekendDays?: WeekDay[];
}

export class GetDepartmentConfigQueryDto {
    @IsOptional()
    @IsIn(EMPLOYEE_DEPARTMENTS)
    department?: EmployeeDepartment;
}
