import { IsDateString, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateLeaveDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsMongoId()
    @IsNotEmpty()
    flagId: string; // The Leave Type (Flag)

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
