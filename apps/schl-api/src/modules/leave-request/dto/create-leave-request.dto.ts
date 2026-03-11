import {
    LEAVE_REQUEST_TYPES,
    type LeaveRequestType,
} from '@repo/common/constants/leave-request.constant';
import {
    IsBoolean,
    IsDateString,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateLeaveRequestDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(LEAVE_REQUEST_TYPES as readonly LeaveRequestType[])
    leaveType: LeaveRequestType;

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

export class UpdateLeaveRequestStatusDto {
    @IsString()
    @IsNotEmpty()
    status: 'approved' | 'rejected';
}

export class UpdateLeaveRequestDto {
    @IsOptional()
    @IsMongoId()
    employeeId?: string;

    @IsOptional()
    @IsString()
    @IsIn(LEAVE_REQUEST_TYPES as readonly LeaveRequestType[])
    leaveType?: LeaveRequestType;

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
