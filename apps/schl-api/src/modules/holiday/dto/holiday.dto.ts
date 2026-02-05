import {
    HALF_DAY_PERIODS,
    HOLIDAY_TARGET_TYPES,
    HOLIDAY_TYPES,
    LEAVE_PAYMENT_TYPES,
    SHIFT_TYPES,
    type HalfDayPeriod,
    type HolidayTargetType,
    type HolidayType,
    type LeavePaymentType,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateIf,
} from 'class-validator';

export class CreateHolidayDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsIn(HOLIDAY_TYPES as readonly HolidayType[])
    holidayType: HolidayType;

    @ValidateIf(o => o.holidayType === 'half_day')
    @IsNotEmpty({
        message: 'Half day period is required for half-day holidays',
    })
    @IsIn(HALF_DAY_PERIODS as readonly HalfDayPeriod[])
    halfDayPeriod?: HalfDayPeriod;

    @IsNotEmpty()
    @IsIn(LEAVE_PAYMENT_TYPES as readonly LeavePaymentType[])
    paymentType: LeavePaymentType;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    endDate: Date;

    @IsNotEmpty()
    @IsIn(HOLIDAY_TARGET_TYPES as readonly HolidayTargetType[])
    targetType: HolidayTargetType;

    @ValidateIf(o => o.targetType === 'shift')
    @IsNotEmpty({ message: 'Target shift is required when targeting by shift' })
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    targetShift?: ShiftType;

    @ValidateIf(o => o.targetType === 'individual')
    @IsArray()
    @IsMongoId({ each: true })
    @IsNotEmpty({
        message: 'Target employees are required when targeting individuals',
    })
    targetEmployees?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateHolidayDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsIn(HOLIDAY_TYPES as readonly HolidayType[])
    holidayType?: HolidayType;

    @IsOptional()
    @IsIn(HALF_DAY_PERIODS as readonly HalfDayPeriod[])
    halfDayPeriod?: HalfDayPeriod | null;

    @IsOptional()
    @IsIn(LEAVE_PAYMENT_TYPES as readonly LeavePaymentType[])
    paymentType?: LeavePaymentType;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @IsOptional()
    @IsIn(HOLIDAY_TARGET_TYPES as readonly HolidayTargetType[])
    targetType?: HolidayTargetType;

    @IsOptional()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    targetShift?: ShiftType | null;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    targetEmployees?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class GetHolidaysQueryDto {
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    fromDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    toDate?: Date;

    @IsOptional()
    @IsIn(HOLIDAY_TYPES as readonly HolidayType[])
    holidayType?: HolidayType;

    @IsOptional()
    @IsIn(HOLIDAY_TARGET_TYPES as readonly HolidayTargetType[])
    targetType?: HolidayTargetType;

    @IsOptional()
    @IsIn(SHIFT_TYPES as readonly ShiftType[])
    targetShift?: ShiftType;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isActive?: boolean;
}

export class CheckEmployeeHolidayDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    date: Date;
}
