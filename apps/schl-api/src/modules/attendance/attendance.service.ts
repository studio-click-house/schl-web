import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Attendance } from '@repo/common/models/attendance.schema';
import { DepartmentConfig } from '@repo/common/models/department-config.schema';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { Holiday } from '@repo/common/models/holiday.schema';
import { ShiftSchedule } from '@repo/common/models/shift-schedule.schema';
import { Shift } from '@repo/common/models/shift.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    calculateOvertime,
    calculateWorkingHoursSummary,
    DEFAULT_WEEKEND_DAYS,
    isWeekendDay,
    type OvertimeResult,
    type ShiftTiming,
    type WorkingHoursSummary,
} from '@repo/common/utils/overtime.util';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import mongoose, { Model } from 'mongoose';
import {
    GetAttendanceWithOTDto,
    GetEmployeeAttendanceSummaryDto,
} from './dto/attendance-report.dto';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkEmployeeDto } from './dto/mark-employee.dto';
import { AttendanceFactory } from './factories/attendance.factory';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);
    constructor(
        @InjectModel(Attendance.name)
        private attendanceModel: Model<Attendance>,
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUser>,
        @InjectModel(Shift.name)
        private shiftModel: Model<Shift>,
        @InjectModel(ShiftSchedule.name)
        private scheduleModel: Model<ShiftSchedule>,
        @InjectModel(Holiday.name)
        private holidayModel: Model<Holiday>,
        @InjectModel(DepartmentConfig.name)
        private departmentConfigModel: Model<DepartmentConfig>,
        @InjectModel(Employee.name)
        private employeeModel: Model<Employee>,
    ) {}

    private validateTimestamp(timestamp: string): Date {
        const parsedTime = moment.tz(timestamp, 'Asia/Dhaka');

        // Explicitly check for invalid date
        if (!parsedTime.isValid()) {
            this.logger.warn(
                `Invalid timestamp received: ${timestamp}. Using server time instead.`,
            );
            return moment.tz('Asia/Dhaka').toDate();
        }

        const serverTime = moment.tz('Asia/Dhaka');
        const diffMinutes = Math.abs(serverTime.diff(parsedTime, 'minutes'));

        // Allow ±5 minutes deviation from server time
        if (diffMinutes > 5) {
            this.logger.warn(
                `Timestamp deviation detected: ${diffMinutes} minutes from server time. Using server time instead.`,
            );
            return serverTime.toDate();
        }

        return parsedTime.toDate();
    }

    async markAttendance(body: MarkEmployeeDto) {
        // lookup employee reference from device-user mapping
        const deviceUserMapping = await this.deviceUserModel
            .findOne({ user_id: body.userId })
            .select('employee')
            .exec();

        if (!deviceUserMapping || !deviceUserMapping.employee) {
            throw new InternalServerErrorException(
                `User ID ${body.userId} is not mapped to any employee in the system`,
            );
        }

        // Validate and normalize timestamp
        const currentTime = this.validateTimestamp(body.timestamp);

        try {
            // Atomic update-first approach: try to close existing open attendance
            // findOneAndUpdate is atomic and avoids ambiguity of separate read
            const closed = await this.attendanceModel.findOneAndUpdate(
                {
                    user_id: body.userId,
                    out_time: null,
                },
                {
                    $set: { out_time: currentTime },
                },
                { new: true }, // return updated document
            );

            if (closed) {
                return closed;
            }

            // No open session found, create new check-in
            const payload = AttendanceFactory.fromMarkDto(
                body,
                currentTime,
                deviceUserMapping.employee,
            );
            const created = await this.attendanceModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to mark attendance',
                );
            }
            return created;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to mark attendance', err as Error);
            throw new InternalServerErrorException(
                'Unable to mark attendance at this time',
            );
        }
    }

    async createAttendance(
        attendanceData: CreateAttendanceBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_device_user',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create attendance records",
            );
        }

        const payload = AttendanceFactory.fromCreateDto(attendanceData);
        payload.employee = attendanceData.employeeId as any;

        try {
            const created = await this.attendanceModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create attendance record',
                );
            }
            return created;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create attendance record', err);
            throw new InternalServerErrorException(
                'Unable to create attendance record at this time',
            );
        }
    }

    async updateAttendance(
        attendanceId: string,
        attendanceData: Partial<CreateAttendanceBodyDto>,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'admin:edit_device_user',
            userSession.permissions,
        );

        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to update attendance records",
            );
        }

        const existing = await this.attendanceModel
            .findById(attendanceId)
            .exec();
        if (!existing) {
            throw new NotFoundException('Attendance record not found');
        }

        const patch = AttendanceFactory.fromUpdateDto(attendanceData);

        try {
            const updated = await this.attendanceModel.findByIdAndUpdate(
                attendanceId,
                { $set: patch },
                { new: true },
            );
            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update attendance record',
                );
            }
            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to update attendance record', err);
            throw new InternalServerErrorException(
                'Unable to update attendance record at this time',
            );
        }
    }

    async deleteAttendance(attendanceId: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:delete_device_user',
            userSession.permissions,
        );

        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete attendance records",
            );
        }

        const existing = await this.attendanceModel
            .findById(attendanceId)
            .exec();
        if (!existing) {
            throw new BadRequestException('Attendance record not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Deleted the attendance record successfully' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete attendance record', err);
            throw new InternalServerErrorException(
                'Unable to delete attendance record at this time',
            );
        }
    }

    // ==================== OVERTIME & REPORTING ====================

    /**
     * Get employee's shift for a specific date
     */
    private async getEmployeeShiftForDate(
        employeeId: string,
        date: Date,
    ): Promise<Shift | null> {
        const targetDate = moment
            .tz(date, 'Asia/Dhaka')
            .startOf('day')
            .toDate();

        // Find schedule where the date falls within the start_date and end_date range
        const schedule = await this.scheduleModel
            .findOne({
                employee: new mongoose.Types.ObjectId(employeeId),
                start_date: { $lte: targetDate },
                end_date: { $gte: targetDate },
            })
            .populate('shift')
            .exec();

        if (!schedule || !schedule.shift) {
            return null;
        }

        return schedule.shift as unknown as Shift;
    }

    /**
     * Check if a date is a weekend for the employee's department
     */
    private async isWeekendForEmployee(
        employeeId: string,
        date: Date,
    ): Promise<boolean> {
        // Get employee's department
        const employee = await this.employeeModel
            .findById(employeeId)
            .select('department')
            .exec();

        if (!employee?.department) {
            // Default to standard weekend if no department found
            return isWeekendDay(date, DEFAULT_WEEKEND_DAYS);
        }

        // Get department config
        const deptConfig = await this.departmentConfigModel
            .findOne({ department: employee.department })
            .exec();

        const weekendDays = deptConfig?.weekend_days || DEFAULT_WEEKEND_DAYS;
        return isWeekendDay(date, weekendDays);
    }

    /**
     * Check if a date is a holiday for the employee
     */
    private async isHolidayForEmployee(
        employeeId: string,
        date: Date,
        shiftType: string | null,
    ): Promise<Holiday | null> {
        const targetDate = moment
            .tz(date, 'Asia/Dhaka')
            .startOf('day')
            .toDate();

        const query: any = {
            is_active: true,
            start_date: { $lte: targetDate },
            end_date: { $gte: targetDate },
            $or: [
                { target_type: 'all' },
                ...(shiftType
                    ? [{ target_type: 'shift', target_shift: shiftType }]
                    : []),
                {
                    target_type: 'individual',
                    target_employees: new mongoose.Types.ObjectId(employeeId),
                },
            ],
        };

        return await this.holidayModel.findOne(query).exec();
    }

    /**
     * Get attendance records with overtime calculations for an employee
     */
    async getAttendanceWithOT(dto: GetAttendanceWithOTDto) {
        const attendances = await this.attendanceModel
            .find({
                employee: new mongoose.Types.ObjectId(dto.employeeId),
                in_time: {
                    $gte: dto.fromDate,
                    $lte: dto.toDate,
                },
            })
            .sort({ in_time: 1 })
            .exec();

        const results: Array<{
            attendance: Attendance;
            shift: Shift | null;
            overtime: OvertimeResult | null;
            isHoliday: boolean;
            holiday: Holiday | null;
        }> = [];

        for (const attendance of attendances) {
            const shift = await this.getEmployeeShiftForDate(
                dto.employeeId,
                attendance.in_time,
            );

            const shiftType = shift?.type || null;
            const holiday = await this.isHolidayForEmployee(
                dto.employeeId,
                attendance.in_time,
                shiftType,
            );

            // Check if the day is a weekend for this employee's department
            const isWeekend = await this.isWeekendForEmployee(
                dto.employeeId,
                attendance.in_time,
            );

            // Day is considered a holiday if it's either an official holiday OR a weekend
            const isHolidayOrWeekend = !!holiday || isWeekend;

            let overtime: OvertimeResult | null = null;
            if (shift && attendance.out_time) {
                const shiftTiming: ShiftTiming = {
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    crosses_midnight: shift.crosses_midnight,
                    grace_minutes: shift.grace_minutes,
                };
                overtime = calculateOvertime(
                    attendance.in_time,
                    attendance.out_time,
                    shiftTiming,
                    { isHoliday: isHolidayOrWeekend },
                );
            }

            results.push({
                attendance,
                shift,
                overtime,
                isHoliday: isHolidayOrWeekend,
                holiday,
            });
        }

        return results;
    }

    /**
     * Get monthly attendance summary with OT for an employee
     */
    async getEmployeeAttendanceSummary(dto: GetEmployeeAttendanceSummaryDto) {
        const monthDate = dto.month || new Date();
        const startOfMonth = moment
            .tz(monthDate, 'Asia/Dhaka')
            .startOf('month')
            .toDate();
        const endOfMonth = moment
            .tz(monthDate, 'Asia/Dhaka')
            .endOf('month')
            .toDate();

        const attendanceWithOT = await this.getAttendanceWithOT({
            employeeId: dto.employeeId,
            fromDate: startOfMonth,
            toDate: endOfMonth,
        });

        // Collect OT results for completed sessions
        const overtimeResults: OvertimeResult[] = attendanceWithOT
            .filter(r => r.overtime !== null)
            .map(r => r.overtime!);

        // Calculate summary
        const workingSummary: WorkingHoursSummary =
            calculateWorkingHoursSummary(overtimeResults);

        // Count holidays in the period
        const holidaysInPeriod = attendanceWithOT.filter(r => r.isHoliday);

        // Count days with open sessions
        const openSessions = attendanceWithOT.filter(
            r => !r.attendance.out_time,
        );

        return {
            month: moment.tz(monthDate, 'Asia/Dhaka').format('MMMM YYYY'),
            employeeId: dto.employeeId,
            summary: {
                ...workingSummary,
                holidayCount: holidaysInPeriod.length,
                openSessionCount: openSessions.length,
            },
            details: attendanceWithOT,
        };
    }

    /**
     * Get all attendance records for a date range (for reports)
     */
    async getAttendanceRecords(
        fromDate: Date,
        toDate: Date,
        employeeId?: string,
    ) {
        const filter: any = {
            in_time: {
                $gte: fromDate,
                $lte: toDate,
            },
        };

        if (employeeId) {
            filter.employee = new mongoose.Types.ObjectId(employeeId);
        }

        return await this.attendanceModel
            .find(filter)
            .populate('employee', 'e_id real_name designation department')
            .sort({ in_time: -1 })
            .exec();
    }
}
