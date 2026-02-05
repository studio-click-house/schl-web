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
    eId: string;

    @IsString()
    @IsNotEmpty()
    realName: string;

    @IsString()
    @IsNotEmpty()
    joiningDate: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    birthDate?: string;

    @IsOptional()
    @IsString()
    nid?: string;

    @IsOptional()
    @IsIn(EMPLOYEE_BLOOD_GROUPS as readonly EmployeeBloodGroup[])
    bloodGroup?: EmployeeBloodGroup;

    @IsString()
    @IsNotEmpty()
    designation: string;

    @IsString()
    @IsNotEmpty()
    department: string;

    @IsNumber()
    @Min(0)
    grossSalary: number;

    @IsNumber()
    @Min(0)
    bonusEidUlAdha: number;

    @IsNumber()
    @Min(0)
    bonusEidUlFitr: number;

    @IsString()
    @IsNotEmpty()
    @IsIn(EMPLOYEE_STATUSES as readonly EmployeeStatus[])
    status: EmployeeStatus;

    @IsOptional()
    @IsString()
    statusChangeNote?: string; // reason for changing to non-earning status

    @IsOptional()
    @IsNumber()
    @Min(0)
    providentFund?: number;

    @IsOptional()
    @IsString()
    pfStartDate?: string | null;

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
    companyProvidedName?: string | null;

    @IsOptional()
    @IsString()
    note?: string;
}
