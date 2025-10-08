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
import {
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_SERVICE_TIME,
    EMPLOYEE_STATUSES,
    type EmployeeBloodGroup,
    type EmployeeServiceTime,
    type EmployeeStatus,
} from 'src/common/constants/employee.constant';
import { toBoolean } from 'src/common/utils/transformers';

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

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    filtered: boolean = false;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    paginated: boolean = false;
}

export class SearchEmployeesBodyDto {
    @IsOptional()
    @IsString()
    @IsIn(EMPLOYEE_BLOOD_GROUPS)
    bloodGroup?: EmployeeBloodGroup;

    @IsOptional()
    @IsIn(['Junior', 'Mid', 'Senior'])
    designation?: string;

    @IsOptional()
    @IsIn(EMPLOYEE_STATUSES)
    status?: EmployeeStatus;

    @IsOptional()
    @IsIn(['HR', 'Engineering', 'Sales'])
    department?: string;

    @IsOptional()
    @IsIn(EMPLOYEE_SERVICE_TIME)
    serviceTime?: EmployeeServiceTime;

    @IsOptional()
    @IsString()
    generalSearchString?: string;
}
