import { ShiftAdjustment } from '@repo/common/models/shift-adjustment.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { Types } from 'mongoose';
import * as moment from 'moment-timezone';
import { CreateShiftAdjustmentBodyDto } from '../dto/create-shift-adjustment.dto';
import { UpdateShiftAdjustmentBodyDto } from '../dto/update-shift-adjustment.dto';

export class ShiftAdjustmentFactory {
    static fromCreateDto(
        dto: CreateShiftAdjustmentBodyDto,
        userSession: UserSession,
    ): Partial<ShiftAdjustment> {
        let crossesMidnight = false;
        if (
            dto.shiftStart &&
            dto.shiftEnd &&
            dto.adjustmentType === 'replace'
        ) {
            const startParts = dto.shiftStart.split(':');
            const endParts = dto.shiftEnd.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
        } else if (
            dto.shiftStart &&
            dto.shiftEnd &&
            dto.adjustmentType === 'off_day'
        ) {
            const startParts = dto.shiftStart.split(':');
            const endParts = dto.shiftEnd.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
        }

        const shiftDate = moment
            .tz(dto.shiftDate, 'Asia/Dhaka')
            .startOf('day')
            .toDate();

        return {
            employee: new Types.ObjectId(dto.employeeId) as any,
            shift_date: shiftDate,
            adjustment_type: dto.adjustmentType,
            shift_type: dto.shiftType,
            shift_start: dto.shiftStart,
            shift_end: dto.shiftEnd,
            crosses_midnight: crossesMidnight,
            updated_by: userSession.db_id,
            comment: dto.comment || null,
            grace_period_minutes: dto.gracePeriodMinutes ?? 10,
        } as Partial<ShiftAdjustment>;
    }

    static fromUpdateDto(
        dto: UpdateShiftAdjustmentBodyDto,
        existing: ShiftAdjustment,
        userSession: UserSession,
    ): Partial<ShiftAdjustment> {
        const patch: Partial<ShiftAdjustment> = {};

        if (dto.shiftDate !== undefined) {
            patch.shift_date = moment
                .tz(dto.shiftDate, 'Asia/Dhaka')
                .startOf('day')
                .toDate();
        }

        if (dto.adjustmentType !== undefined) {
            patch.adjustment_type = dto.adjustmentType;
        }

        if (dto.shiftType !== undefined) {
            patch.shift_type = dto.shiftType;
        }

        const shiftStart =
            dto.shiftStart !== undefined
                ? dto.shiftStart
                : existing.shift_start;
        const shiftEnd =
            dto.shiftEnd !== undefined ? dto.shiftEnd : existing.shift_end;
        const adjustmentType =
            dto.adjustmentType !== undefined
                ? dto.adjustmentType
                : existing.adjustment_type;

        if (
            dto.shiftStart !== undefined ||
            dto.shiftEnd !== undefined ||
            dto.adjustmentType !== undefined
        ) {
            if (dto.shiftStart !== undefined)
                patch.shift_start = dto.shiftStart;
            if (dto.shiftEnd !== undefined) patch.shift_end = dto.shiftEnd;

            let crossesMidnight = false;
            if (
                shiftStart &&
                shiftEnd &&
                (adjustmentType === 'replace' || adjustmentType === 'off_day')
            ) {
                const startParts = shiftStart.split(':');
                const endParts = shiftEnd.split(':');
                const startHour = startParts[0]
                    ? parseInt(startParts[0], 10)
                    : 0;
                const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
                crossesMidnight = endHour < startHour;
            }
            patch.crosses_midnight = crossesMidnight;
        }

        if (dto.comment !== undefined) {
            patch.comment = dto.comment || null;
        }

        if (dto.gracePeriodMinutes !== undefined) {
            patch.grace_period_minutes = dto.gracePeriodMinutes;
        }

        if (dto.active !== undefined) {
            patch.active = dto.active;
        }

        patch.updated_by = userSession.db_id;

        return patch;
    }
}
