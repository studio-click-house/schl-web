import {
    type EmployeeBloodGroup,
    type EmployeeStatus,
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_STATUSES,
} from '@repo/common/constants/employee.constant';
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateEmployeeBodyDto {
    @IsString()
    @IsNotEmpty()
    e_id: string;

    @IsString()
    @IsNotEmpty()
    real_name: string;

    @IsString()
    @IsNotEmpty()
    joining_date: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    birth_date?: string;

    @IsOptional()
    @IsString()
    nid?: string;

    @IsOptional()
    @IsIn(EMPLOYEE_BLOOD_GROUPS as readonly EmployeeBloodGroup[])
    blood_group?: EmployeeBloodGroup;

    @IsString()
    @IsNotEmpty()
    designation: string;

    @IsString()
    @IsNotEmpty()
    department: string;

    @IsNumber()
    @Min(0)
    gross_salary: number;

    @IsNumber()
    @Min(0)
    bonus_eid_ul_adha: number;

    @IsNumber()
    @Min(0)
    bonus_eid_ul_fitr: number;

    @IsString()
    @IsNotEmpty()
    @IsIn(EMPLOYEE_STATUSES as readonly EmployeeStatus[])
    status: EmployeeStatus;

    @IsOptional()
    @IsNumber()
    @Min(0)
    provident_fund?: number;

    @IsOptional()
    @IsString()
    pf_start_date?: string | null;

    @IsOptional()
    @IsString()
    branch?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    division?: string;

    @IsOptional()
    @IsString()
    company_provided_name?: string | null;

    @IsOptional()
    @IsString()
    note?: string;
}
