import {
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ShiftType } from '@repo/common/constants/shift.constant';
import { Holiday } from '@repo/common/models/holiday.schema';
import { ShiftSchedule } from '@repo/common/models/shift-schedule.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import mongoose, { Model } from 'mongoose';
import {
    CheckEmployeeHolidayDto,
    CreateHolidayDto,
    GetHolidaysQueryDto,
    UpdateHolidayDto,
} from './dto/holiday.dto';
import { HolidayFactory } from './factories/holiday.factory';

@Injectable()
export class HolidayService {
    private readonly logger = new Logger(HolidayService.name);

    constructor(
        @InjectModel(Holiday.name)
        private holidayModel: Model<Holiday>,
        @InjectModel(ShiftSchedule.name)
        private scheduleModel: Model<ShiftSchedule>,
    ) {}

    async createHoliday(dto: CreateHolidayDto, userSession: UserSession) {
        const canCreate = hasPerm(
            'admin:manage_holidays',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create holidays",
            );
        }

        const payload = HolidayFactory.fromCreateDto(
            dto,
            new mongoose.Types.ObjectId(userSession.db_id),
        );

        try {
            const created = await this.holidayModel.create(payload);
            return created;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create holiday', err);
            throw new InternalServerErrorException(
                'Unable to create holiday at this time',
            );
        }
    }

    async updateHoliday(
        holidayId: string,
        dto: UpdateHolidayDto,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'admin:manage_holidays',
            userSession.permissions,
        );
        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to update holidays",
            );
        }

        const existing = await this.holidayModel.findById(holidayId).exec();
        if (!existing) {
            throw new NotFoundException('Holiday not found');
        }

        const patch = HolidayFactory.fromUpdateDto(dto);

        try {
            const updated = await this.holidayModel.findByIdAndUpdate(
                holidayId,
                { $set: patch },
                { new: true },
            );
            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to update holiday', err);
            throw new InternalServerErrorException(
                'Unable to update holiday at this time',
            );
        }
    }

    async getHolidays(query: GetHolidaysQueryDto) {
        const filter: any = {};

        if (query.fromDate && query.toDate) {
            filter.start_date = {
                $lte: query.toDate,
            };
            filter.end_date = {
                $gte: query.fromDate,
            };
        } else if (query.fromDate) {
            filter.end_date = { $gte: query.fromDate };
        } else if (query.toDate) {
            filter.start_date = { $lte: query.toDate };
        }

        if (query.holidayType) {
            filter.holiday_type = query.holidayType;
        }

        if (query.targetType) {
            filter.target_type = query.targetType;
        }

        if (query.targetShift) {
            filter.target_shift = query.targetShift;
        }

        if (query.isActive !== undefined) {
            filter.is_active = query.isActive;
        }

        return await this.holidayModel
            .find(filter)
            .populate('target_employees', 'e_id real_name')
            .populate('created_by', 'name email')
            .sort({ start_date: -1 })
            .exec();
    }

    async getHolidayById(holidayId: string) {
        const holiday = await this.holidayModel
            .findById(holidayId)
            .populate('target_employees', 'e_id real_name')
            .populate('created_by', 'name email')
            .exec();
        if (!holiday) {
            throw new NotFoundException('Holiday not found');
        }
        return holiday;
    }

    async deleteHoliday(holidayId: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:manage_holidays',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete holidays",
            );
        }

        const existing = await this.holidayModel.findById(holidayId).exec();
        if (!existing) {
            throw new NotFoundException('Holiday not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Holiday deleted successfully' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete holiday', err);
            throw new InternalServerErrorException(
                'Unable to delete holiday at this time',
            );
        }
    }

    /**
     * Check if an employee has a holiday on a specific date.
     * This considers:
     * 1. Holidays targeting all employees
     * 2. Holidays targeting the employee's current shift
     * 3. Holidays targeting the specific employee
     */
    async checkEmployeeHoliday(
        dto: CheckEmployeeHolidayDto,
    ): Promise<Holiday | null> {
        const targetDate = moment.tz(dto.date, 'Asia/Dhaka').startOf('day');

        // Get employee's current shift for the week
        const weekStart = targetDate.clone().day(0).toDate();
        const employeeSchedule = await this.scheduleModel
            .findOne({
                employee: new mongoose.Types.ObjectId(dto.employeeId),
                week_start: weekStart,
            })
            .exec();

        const employeeShiftType = employeeSchedule?.shift_type || null;

        // Build query to find applicable holidays
        const targetDateDate = targetDate.toDate();

        const query = {
            is_active: true,
            start_date: { $lte: targetDateDate },
            end_date: { $gte: targetDateDate },
            $or: [
                // Holiday for all employees
                { target_type: 'all' },
                // Holiday for employee's shift (if they have one)
                ...(employeeShiftType
                    ? [
                          {
                              target_type: 'shift',
                              target_shift: employeeShiftType,
                          },
                      ]
                    : []),
                // Holiday specifically for this employee
                {
                    target_type: 'individual',
                    target_employees: new mongoose.Types.ObjectId(
                        dto.employeeId,
                    ),
                },
            ],
        };

        const holiday = await this.holidayModel.findOne(query).exec();
        return holiday;
    }

    /**
     * Get all employees affected by a specific holiday.
     * Returns employee IDs based on the holiday's targeting.
     */
    async getAffectedEmployees(holidayId: string): Promise<string[]> {
        const holiday = await this.holidayModel.findById(holidayId).exec();
        if (!holiday) {
            throw new NotFoundException('Holiday not found');
        }

        switch (holiday.target_type) {
            case 'all':
                // Return empty array to indicate "all" - caller should handle this
                return [];

            case 'shift':
                // Get all employees on this shift for the holiday period
                const shiftSchedules = await this.scheduleModel
                    .find({
                        shift_type: holiday.target_shift as ShiftType,
                        week_start: {
                            $lte: holiday.end_date,
                        },
                        week_end: {
                            $gte: holiday.start_date,
                        },
                    })
                    .distinct('employee')
                    .exec();
                return shiftSchedules.map(id => id.toString());

            case 'individual':
                return holiday.target_employees.map(id => id.toString());

            default:
                return [];
        }
    }

    /**
     * Get upcoming holidays for an employee within a date range.
     */
    async getEmployeeUpcomingHolidays(
        employeeId: string,
        fromDate: Date,
        toDate: Date,
    ): Promise<Holiday[]> {
        // Get employee's shift schedules for the date range
        const schedules = await this.scheduleModel
            .find({
                employee: new mongoose.Types.ObjectId(employeeId),
                week_start: { $lte: toDate },
                week_end: { $gte: fromDate },
            })
            .exec();

        const shiftTypes = [...new Set(schedules.map(s => s.shift_type))];

        const query = {
            is_active: true,
            start_date: { $lte: toDate },
            end_date: { $gte: fromDate },
            $or: [
                { target_type: 'all' },
                { target_type: 'shift', target_shift: { $in: shiftTypes } },
                {
                    target_type: 'individual',
                    target_employees: new mongoose.Types.ObjectId(employeeId),
                },
            ],
        };

        return await this.holidayModel
            .find(query)
            .sort({ start_date: 1 })
            .exec();
    }
}
