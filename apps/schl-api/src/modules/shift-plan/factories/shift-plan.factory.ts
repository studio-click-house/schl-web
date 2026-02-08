import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import * as moment from 'moment-timezone';
import { CreateShiftPlanBodyDto } from '../dto/create-shift-plan.dto';

export class ShiftPlanFactory {
    /**
     * Create a ShiftPlan document from the create DTO
     */
    static fromCreateDto(
        dto: CreateShiftPlanBodyDto,
        userId: string,
    ): Partial<ShiftPlan> {
        const timeParts = dto.shiftStart.split(':');
        const startHour = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
        const startMin = timeParts[1] ? parseInt(timeParts[1], 10) : 0;

        const endTimeParts = dto.shiftEnd.split(':');
        const endHour = endTimeParts[0] ? parseInt(endTimeParts[0], 10) : 0;
        const endMin = endTimeParts[1] ? parseInt(endTimeParts[1], 10) : 0;

        // Auto-determine crosses_midnight if not provided
        let crossesMidnight = dto.crossesMidnight ?? false;
        if (!dto.crossesMidnight) {
            // If end time is less than start time (e.g., 15:00 to 01:00),
            // it crosses midnight
            const endTotalMins = endHour * 60 + endMin;
            const startTotalMins = startHour * 60 + startMin;
            crossesMidnight = endTotalMins < startTotalMins;
        }

        return {
            employee: dto.employeeId as any,
            shift_date: moment
                .tz(dto.shiftDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                .toDate(),
            shift_type: dto.shiftType,
            shift_start: dto.shiftStart,
            shift_end: dto.shiftEnd,
            grace_period_minutes: 10, // Fixed at 10 minutes
            crosses_midnight: crossesMidnight,
            updated_by: userId,
            change_reason: dto.changeReason || null,
        };
    }

    /**
     * Create a partial ShiftPlan document for updates
     */
    static fromUpdateDto(
        dto: Partial<CreateShiftPlanBodyDto>,
        userId: string,
    ): Partial<ShiftPlan> {
        const update: any = {};

        if (dto.shiftType !== undefined) {
            update.shift_type = dto.shiftType;
        }

        if (dto.shiftStart !== undefined) {
            update.shift_start = dto.shiftStart;
        }

        if (dto.shiftEnd !== undefined) {
            update.shift_end = dto.shiftEnd;

            // Auto-update crosses_midnight if times are changed
            if (dto.shiftStart !== undefined) {
                const startTimeParts = dto.shiftStart.split(':');
                const startHour = startTimeParts[0]
                    ? parseInt(startTimeParts[0], 10)
                    : 0;
                const startMin = startTimeParts[1]
                    ? parseInt(startTimeParts[1], 10)
                    : 0;

                const endTimeParts = dto.shiftEnd.split(':');
                const endHour = endTimeParts[0]
                    ? parseInt(endTimeParts[0], 10)
                    : 0;
                const endMin = endTimeParts[1]
                    ? parseInt(endTimeParts[1], 10)
                    : 0;

                const endTotalMins = endHour * 60 + endMin;
                const startTotalMins = startHour * 60 + startMin;
                update.crosses_midnight = endTotalMins < startTotalMins;
            }
        }

        if (dto.changeReason !== undefined) {
            update.change_reason = dto.changeReason || null;
        }

        update.updated_by = userId;

        return update;
    }
}
