import { Holiday } from '@repo/common/models/holiday.schema';
import mongoose from 'mongoose';
import { CreateHolidayDto, UpdateHolidayDto } from '../dto/holiday.dto';

export class HolidayFactory {
    static fromCreateDto(
        dto: CreateHolidayDto,
        createdBy?: mongoose.Types.ObjectId,
    ): Partial<Holiday> {
        return {
            title: dto.title.trim(),
            description: dto.description?.trim() || '',
            holiday_type: dto.holidayType,
            half_day_period:
                dto.holidayType === 'half_day' ? dto.halfDayPeriod : null,
            payment_type: dto.paymentType,
            start_date: dto.startDate,
            end_date: dto.endDate,
            target_type: dto.targetType,
            target_shift: dto.targetType === 'shift' ? dto.targetShift : null,
            target_employees:
                dto.targetType === 'individual'
                    ? dto.targetEmployees?.map(
                          id => new mongoose.Types.ObjectId(id),
                      )
                    : [],
            is_active: dto.isActive ?? true,
            created_by: createdBy,
        } as Partial<Holiday>;
    }

    static fromUpdateDto(dto: UpdateHolidayDto): Partial<Holiday> {
        const patch: Partial<Holiday> = {};

        if (dto.title !== undefined) patch.title = dto.title.trim();
        if (dto.description !== undefined)
            patch.description = dto.description?.trim() || '';
        if (dto.holidayType !== undefined) patch.holiday_type = dto.holidayType;
        if (dto.halfDayPeriod !== undefined)
            patch.half_day_period = dto.halfDayPeriod;
        if (dto.paymentType !== undefined) patch.payment_type = dto.paymentType;
        if (dto.startDate !== undefined) patch.start_date = dto.startDate;
        if (dto.endDate !== undefined) patch.end_date = dto.endDate;
        if (dto.targetType !== undefined) patch.target_type = dto.targetType;
        if (dto.targetShift !== undefined) patch.target_shift = dto.targetShift;
        if (dto.targetEmployees !== undefined) {
            patch.target_employees = dto.targetEmployees.map(
                id => new mongoose.Types.ObjectId(id),
            );
        }
        if (dto.isActive !== undefined) patch.is_active = dto.isActive;

        return patch;
    }
}
