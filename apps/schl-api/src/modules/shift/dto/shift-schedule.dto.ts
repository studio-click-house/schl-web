import {
    SHIFT_TYPES,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { toBoolean } from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsIn,
    IsInt,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class AssignEmployeeShiftDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsMongoId()
    @IsNotEmpty()
    shiftId: string;

    @IsNotEmpty()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    shiftType: ShiftType;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    startDate: Date; // Start of the shift assignment period

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    endDate: Date; // End of the shift assignment period

    @IsOptional()
    @IsString()
    notes?: string;
}

export class BulkAssignShiftDto {
    @IsArray()
    @IsMongoId({ each: true })
    @IsNotEmpty()
    employeeIds: string[];

    @IsMongoId()
    @IsNotEmpty()
    shiftId: string;

    @IsNotEmpty()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    shiftType: ShiftType;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    startDate: Date; // Start of the shift assignment period

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    endDate: Date; // End of the shift assignment period

    @IsOptional()
    @IsString()
    notes?: string;
}

export class GetShiftScheduleDto {
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
    paginated: boolean = false;

    @IsOptional()
    @IsMongoId()
    employeeId?: string;

    @IsOptional()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    shiftType?: ShiftType;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    fromDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    toDate?: Date;
}
