import { STANDARD_SHIFTS } from '@repo/common/constants/shift-plan.constant';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import * as moment from 'moment-timezone';
import { toObjectId } from '../../../common/utils/id-helpers.utils';
import { CreateBulkShiftPlanBodyDto } from '../dto/create-bulk-shift-plan.dto';
import { UpdateShiftPlanBodyDto } from '../dto/update-shift-plan.dto';

export class ShiftPlanFactory {
    static fromBulkCreateDto(
        dto: CreateBulkShiftPlanBodyDto,
        employeeId: string,
        fromDate: Date,
        toDate: Date,
        userSession: UserSession,
    ): Partial<ShiftPlan> {
        let shiftStart: string;
        let shiftEnd: string;
        let crossesMidnight: boolean;

        if (dto.shiftType === 'custom') {
            shiftStart = dto.shiftStart!;
            shiftEnd = dto.shiftEnd!;
            const startParts = shiftStart.split(':');
            const endParts = shiftEnd.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
        } else {
            const standardShift = STANDARD_SHIFTS[dto.shiftType];
            shiftStart = standardShift.start;
            shiftEnd = standardShift.end;
            crossesMidnight = standardShift.crossesMidnight;
        }

        return {
            employee: toObjectId(employeeId) as any,
            effective_from: fromDate,
            effective_to: toDate,
            shift_type: dto.shiftType,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            crosses_midnight: crossesMidnight,
            active: true,
            updated_by: userSession.db_id,
            comment: dto.comment || null,
            grace_period_minutes: dto.gracePeriodMinutes ?? 10,
        } as Partial<ShiftPlan>;
    }

    static fromUpdateDto(
        dto: UpdateShiftPlanBodyDto,
        existing: ShiftPlan,
        userSession: UserSession,
    ): Partial<ShiftPlan> {
        const patch: Partial<ShiftPlan> = {};

        const startTime = dto.shiftStart || existing.shift_start;
        const endTime = dto.shiftEnd || existing.shift_end;
        let crossesMidnight = existing.crosses_midnight;

        if (dto.shiftStart !== undefined || dto.shiftEnd !== undefined) {
            patch.shift_start = startTime;
            patch.shift_end = endTime;
            if (startTime && endTime) {
                const startParts = startTime.split(':');
                const endParts = endTime.split(':');
                const startHour = startParts[0]
                    ? parseInt(startParts[0], 10)
                    : 0;
                const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
                crossesMidnight = endHour < startHour;
            }
            patch.crosses_midnight = crossesMidnight;
        }

        if (dto.shiftType !== undefined) patch.shift_type = dto.shiftType;
        if (dto.comment !== undefined) patch.comment = dto.comment || null;
        if (dto.active !== undefined) patch.active = dto.active;

        if (dto.fromDate !== undefined) {
            patch.effective_from = moment
                .tz(dto.fromDate, 'Asia/Dhaka')
                .startOf('day')
                .toDate();
        }
        if (dto.toDate !== undefined) {
            patch.effective_to = moment
                .tz(dto.toDate, 'Asia/Dhaka')
                .startOf('day')
                .toDate();
        }

        if (dto.gracePeriodMinutes !== undefined) {
            patch.grace_period_minutes = dto.gracePeriodMinutes;
        }

        patch.updated_by = userSession.db_id;

        return patch;
    }
}
