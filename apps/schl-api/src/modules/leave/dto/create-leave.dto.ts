import {
    LEAVE_TYPES,
    type LeaveType,
} from '@repo/common/constants/leave.constant';
import {
    IsBoolean,
    IsDateString,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateLeaveDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(LEAVE_TYPES as readonly LeaveType[])
    leaveType: LeaveType;

    @IsBoolean()
    @IsNotEmpty()
    isPaid: boolean;

    @IsOptional()
    @IsIn(['pending', 'approved'] as const)
    status?: 'pending' | 'approved';

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsString()
    @IsNotEmpty()
    reason: string;
}

export class UpdateLeaveStatusDto {
    @IsString()
    @IsNotEmpty()
    status: 'approved' | 'rejected';
}

export class UpdateLeaveDto {
    @IsOptional()
    @IsMongoId()
    employeeId?: string;

    @IsOptional()
    @IsString()
    @IsIn(LEAVE_TYPES as readonly LeaveType[])
    leaveType?: LeaveType;

    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected'] as const)
    status?: 'pending' | 'approved' | 'rejected';

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
