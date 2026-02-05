import { ShiftSchedule } from '@repo/common/models/shift-schedule.schema';
import * as moment from 'moment-timezone';
import mongoose from 'mongoose';
import { AssignEmployeeShiftDto } from '../dto/shift-schedule.dto';

type ShiftSchedulePayload = Pick<
    ShiftSchedule,
    'employee' | 'shift' | 'shift_type' | 'start_date' | 'end_date' | 'notes'
> & {
    assigned_by?: mongoose.Types.ObjectId;
};

export class ShiftScheduleFactory {
    static fromAssignDto(
        dto: AssignEmployeeShiftDto,
        assignedBy?: mongoose.Types.ObjectId,
    ): ShiftSchedulePayload {
        const startDate = moment.tz(dto.startDate, 'Asia/Dhaka').startOf('day');
        const endDate = moment.tz(dto.endDate, 'Asia/Dhaka').endOf('day');

        return {
            employee: new mongoose.Types.ObjectId(dto.employeeId),
            shift: new mongoose.Types.ObjectId(dto.shiftId),
            shift_type: dto.shiftType,
            start_date: startDate.toDate(),
            end_date: endDate.toDate(),
            notes: dto.notes?.trim() || '',
            assigned_by: assignedBy,
        };
    }

    /**
     * Normalize a date to start of day
     */
    static normalizeToStartOfDay(date: Date): Date {
        return moment.tz(date, 'Asia/Dhaka').startOf('day').toDate();
    }

    /**
     * Normalize a date to end of day
     */
    static normalizeToEndOfDay(date: Date): Date {
        return moment.tz(date, 'Asia/Dhaka').endOf('day').toDate();
    }
}
