import {
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_DEPARTMENTS,
    EMPLOYEE_SERVICE_TIME,
    EMPLOYEE_STATUSES,
    EmployeeDepartment,
    type EmployeeBloodGroup,
    type EmployeeServiceTime,
    type EmployeeStatus,
} from '@repo/common/constants/employee.constant';
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

export class SearchEmployeesQueryDto {
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

    // @IsOptional()
    // @Type(() => String)
    // @Transform(({ value }) => toBoolean(value, false))
    // @IsBoolean()
    // filtered: boolean = false;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    paginated: boolean = false;
}

export class SearchEmployeesBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    @IsIn(EMPLOYEE_BLOOD_GROUPS)
    bloodGroup?: EmployeeBloodGroup;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    designation?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsIn(EMPLOYEE_STATUSES)
    status?: EmployeeStatus;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsIn(EMPLOYEE_DEPARTMENTS as readonly EmployeeDepartment[])
    department?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsIn(EMPLOYEE_SERVICE_TIME)
    serviceTime?: EmployeeServiceTime;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
