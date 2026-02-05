import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class GetAttendanceWithOTDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    fromDate: Date;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    toDate: Date;
}

export class GetEmployeeAttendanceSummaryDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    month?: Date; // If not provided, current month is used
}
