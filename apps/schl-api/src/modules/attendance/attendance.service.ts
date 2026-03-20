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
import {
    ATTENDANCE_STATUSES,
    DEFAULT_DEVICE_ID,
    DEFAULT_SOURCE_IP,
} from '@repo/common/constants/attendance.constant';
import {
    AttendanceFlag,
    AttendanceFlagDocument,
} from '@repo/common/models/attendance-flag.schema';
import { Attendance } from '@repo/common/models/attendance.schema';
import {
    Department,
    DepartmentDocument,
} from '@repo/common/models/department.schema';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import {
    Employee,
    EmployeeDocument,
} from '@repo/common/models/employee.schema';
import { Holiday, HolidayDocument } from '@repo/common/models/holiday.schema';
import {
    LeaveRequest,
    LeaveRequestDocument,
} from '@repo/common/models/leave-request.schema';
import { ShiftAdjustment } from '@repo/common/models/shift-adjustment.schema';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import { ShiftResolved } from '@repo/common/models/shift-resolved.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    calculateOT,
    calculateOTFromMinutes,
    determineShiftDate,
} from '@repo/common/utils/ot-calculation';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { Model, Types } from 'mongoose';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { SearchAttendanceBodyDto } from './dto/search-attendance.dto';
import { AttendanceFactory } from './factories/attendance.factory';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectModel(Attendance.name)
        private attendanceModel: Model<Attendance>,
        @InjectModel(Employee.name)
        private employeeModel: Model<EmployeeDocument>,
        @InjectModel(Department.name)
        private departmentModel: Model<DepartmentDocument>,
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUser>,
        @InjectModel(ShiftPlan.name)
        private shiftPlanModel: Model<ShiftPlan>,
        @InjectModel(ShiftAdjustment.name)
        private shiftAdjustmentModel: Model<ShiftAdjustment>,
        @InjectModel(ShiftResolved.name)
        private shiftResolvedModel: Model<ShiftResolved>,
        @InjectModel(LeaveRequest.name)
        private leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
        @InjectModel(AttendanceFlag.name)
        private attendanceFlagModel: Model<AttendanceFlagDocument>,
    ) {}

    // Cache for frequently used attendance flags
    private flagCache: Record<
        string,
        { _id: unknown; code: string } | null | undefined
    > = {};

    private async getFlagByCode(
        code: string,
    ): Promise<{ _id: unknown; code: string } | null | undefined> {
        if (!this.flagCache[code]) {
            this.flagCache[code] = (await this.attendanceFlagModel
                .findOne({ code })
                .lean()
                .exec()) as { _id: unknown; code: string } | null;
        }
        return this.flagCache[code];
    }

    public async resolveShiftForDate(
        employeeId: Types.ObjectId | string,
        date: Date,
    ): Promise<ShiftResolved | null> {
        const shiftDate = moment.tz(date, 'Asia/Dhaka').startOf('day').toDate();

        const cached = await this.shiftResolvedModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });
        if (cached) return cached;

        const adjustment = await this.shiftAdjustmentModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });

        if (adjustment) {
            if (adjustment.adjustment_type === 'cancel') {
                return null;
            }

            return await this.shiftResolvedModel.findOneAndUpdate(
                { employee: employeeId, shift_date: shiftDate },
                {
                    $set: {
                        employee: employeeId,
                        shift_date: shiftDate,
                        shift_type: adjustment.shift_type || 'custom',
                        shift_start: adjustment.shift_start || '09:00',
                        shift_end: adjustment.shift_end || '17:00',
                        crosses_midnight: adjustment.crosses_midnight,
                        source: 'adjustment',
                        adjustment_id: adjustment._id,
                        // New: mark off-day overtime preference
                        is_off_day_overtime:
                            adjustment.adjustment_type === 'off_day',
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );
        }

        // Check for Holidays (date range intersection)
        const holiday = await this.holidayModel.findOne({
            $or: [
                { dateFrom: { $lte: shiftDate }, dateTo: { $gte: shiftDate } },
                { date: shiftDate },
            ],
        });
        if (holiday) {
            return await this.shiftResolvedModel.findOneAndUpdate(
                { employee: employeeId, shift_date: shiftDate },
                {
                    $set: {
                        employee: employeeId,
                        shift_date: shiftDate,
                        shift_type: 'morning', // default
                        shift_start: '09:00', // default
                        shift_end: '17:00', // default
                        crosses_midnight: false,
                        source: 'holiday',
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );
        }

        // Fetch Approved Leave Requests
        const leave = await this.leaveRequestModel.findOne({
            employee: employeeId,
            status: 'approved',
            start_date: { $lte: shiftDate },
            end_date: { $gte: shiftDate },
        });
        if (leave) {
            return await this.shiftResolvedModel.findOneAndUpdate(
                { employee: employeeId, shift_date: shiftDate },
                {
                    $set: {
                        employee: employeeId,
                        shift_date: shiftDate,
                        shift_type: 'morning', // default
                        shift_start: '09:00', // default
                        shift_end: '17:00', // default
                        crosses_midnight: false,
                        source: 'leave',
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );
        }

        const plan = await this.shiftPlanModel.findOne({
            employee: employeeId,
            active: true,
            effective_from: { $lte: shiftDate },
            effective_to: { $gte: shiftDate },
        });

        if (!plan) return null;

        return await this.shiftResolvedModel.findOneAndUpdate(
            { employee: employeeId, shift_date: shiftDate },
            {
                $set: {
                    employee: employeeId,
                    shift_date: shiftDate,
                    shift_type: plan.shift_type,
                    shift_start: plan.shift_start,
                    shift_end: plan.shift_end,
                    crosses_midnight: plan.crosses_midnight,
                    source: 'plan',
                    plan_id: plan._id,
                    resolved_at: new Date(),
                },
            },
            { new: true, upsert: true },
        );
    }

    private async evaluateAttendance(
        attendance: Partial<Attendance> | Attendance,
        shift: ShiftResolved,
        employeeId: Types.ObjectId | string,
    ) {
        // 1. Holiday Logic
        if (shift.source === 'holiday') {
            const holiday = await this.holidayModel
                .findOne({
                    dateFrom: { $lte: shift.shift_date },
                    dateTo: { $gte: shift.shift_date },
                })
                .lean();
            if (holiday) {
                // We use the ID directly from the holiday record
                (attendance as any).flag = holiday.flag;
                (attendance as any).late_minutes = 0;
            }
            return;
        }

        // 2. Leave Logic
        if (shift.source === 'leave') {
            const leave = await this.leaveRequestModel
                .findOne({
                    employee: employeeId,
                    status: 'approved',
                    start_date: { $lte: shift.shift_date },
                    end_date: { $gte: shift.shift_date },
                })
                .lean();
            if (leave) {
                (attendance as any).flag = leave.flag;
                (attendance as any).late_minutes = 0;
            }
            return;
        }

        // 3. Regular Shift / Adjustment Logic
        const shiftStartStr = `${moment
            .tz(shift.shift_date, 'Asia/Dhaka')
            .format('YYYY-MM-DD')} ${shift.shift_start}`;
        const shiftStart = moment.tz(
            shiftStartStr,
            'YYYY-MM-DD HH:mm',
            'Asia/Dhaka',
        );

        if (!(attendance as any).in_time) return;

        const inTimeRaw = (attendance as any).in_time as string | Date;
        const inTime = moment.tz(inTimeRaw, 'Asia/Dhaka');
        const diffMinutes = inTime.diff(shiftStart, 'minutes');
        const lateMinutes = Math.max(0, diffMinutes);

        (attendance as any).late_minutes = lateMinutes;

        // Fetch flags (cached)
        const extremeDelay = await this.getFlagByCode('E');
        const delay = await this.getFlagByCode('D');
        const present = await this.getFlagByCode('P');

        // 4. Assign Flag
        const grace = (shift as any).grace_period_minutes ?? 10; // default grace

        // D: late when after grace and up to 30 minutes, E: after 30 minutes
        if (lateMinutes > 30 && extremeDelay) {
            (attendance as any).flag = extremeDelay._id;
        } else if (lateMinutes > grace && delay) {
            (attendance as any).flag = delay._id;
        } else if (present) {
            (attendance as any).flag = present._id;
        }
    }

    private async resolveShiftForTimestamp(
        employeeId: Types.ObjectId | string,
        time: Date,
    ) {
        const today = moment.tz(time, 'Asia/Dhaka').startOf('day').toDate();
        const yesterday = moment
            .tz(today, 'Asia/Dhaka')
            .subtract(1, 'day')
            .toDate();

        const shiftToday = await this.resolveShiftForDate(employeeId, today);
        if (shiftToday) {
            const shiftDate = determineShiftDate(time, {
                shift_start: shiftToday.shift_start,
                crosses_midnight: shiftToday.crosses_midnight,
            });
            return { shift: shiftToday, shiftDate };
        }

        const shiftYesterday = await this.resolveShiftForDate(
            employeeId,
            yesterday,
        );
        if (shiftYesterday) {
            const shiftDate = determineShiftDate(time, {
                shift_start: shiftYesterday.shift_start,
                crosses_midnight: shiftYesterday.crosses_midnight,
            });
            return { shift: shiftYesterday, shiftDate };
        }

        return {
            shift: null,
            shiftDate: moment.tz(time, 'Asia/Dhaka').startOf('day').toDate(),
        };
    }

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

    /**
     * Calculate OT for an attendance record
     */
    private async calculateAttendanceOT(
        attendance: Attendance,
        shiftDate: Date,
        employeeId: Types.ObjectId | string,
    ): Promise<number> {
        if (!attendance.in_time || !attendance.out_time) {
            return 0;
        }

        const inTime = attendance.in_time;
        const outTime = attendance.out_time;

        try {
            const resolved = await this.resolveShiftForDate(
                employeeId,
                shiftDate,
            );

            if (!resolved) {
                // No shift plan found, cannot calculate OT
                return 0;
            }

            // If this shift is marked as an off-day OT (admin chose 'off_day'), treat full worked minutes as OT
            if ((resolved as any).is_off_day_overtime) {
                const actualIn = moment.tz(inTime, 'Asia/Dhaka');
                const actualOut = moment.tz(outTime, 'Asia/Dhaka');
                const workedMinutes = actualOut.diff(actualIn, 'minutes');
                if (workedMinutes <= 0) return 0;
                const otMinutes = calculateOTFromMinutes(workedMinutes);
                return otMinutes;
            }

            const otMinutes = calculateOT({
                in_time: inTime,
                out_time: outTime,
                shift_start: resolved.shift_start,
                shift_end: resolved.shift_end,
                shift_date: shiftDate,
                crosses_midnight: resolved.crosses_midnight,
            });

            return otMinutes;
        } catch (err) {
            this.logger.error('Error calculating OT', err as Error);
            return 0;
        }
    }

    async markAttendance(body: MarkAttendanceDto) {
        const deviceId = body.deviceId?.trim() || DEFAULT_DEVICE_ID;
        const sourceIp = body.sourceIp?.trim() || DEFAULT_SOURCE_IP;
        const normalizedBody: MarkAttendanceDto = {
            ...body,
            deviceId,
            sourceIp,
        };

        // lookup employee reference from device-user mapping
        const deviceUserMapping = await this.deviceUserModel
            .findOne({ user_id: normalizedBody.userId })
            .select('employee')
            .exec();

        if (!deviceUserMapping || !deviceUserMapping.employee) {
            throw new InternalServerErrorException(
                `User ID ${normalizedBody.userId} is not mapped to any employee in the system`,
            );
        }

        // Validate and normalize timestamp
        const currentTime = this.validateTimestamp(body.timestamp);

        const resolved = await this.resolveShiftForTimestamp(
            deviceUserMapping.employee,
            currentTime,
        );
        const shiftDate = resolved.shiftDate;

        try {
            // Find existing attendance for this user on this shift_date
            const existingAttendance = await this.attendanceModel.findOne({
                user_id: normalizedBody.userId,
                shift_date: shiftDate,
            });

            if (!existingAttendance) {
                // First check-in of the shift - create new attendance record
                const payload = AttendanceFactory.fromMarkDto(
                    normalizedBody,
                    currentTime,
                );
                (payload as any).employee = deviceUserMapping.employee;
                (payload as any).shift_date = shiftDate;

                // Evaluate Lateness and Flags
                if (resolved.shift) {
                    await this.evaluateAttendance(
                        payload,
                        resolved.shift,
                        deviceUserMapping.employee,
                    );
                }

                const created = await this.attendanceModel.create(payload);
                if (!created) {
                    throw new InternalServerErrorException(
                        'Failed to mark attendance',
                    );
                }
                return created;
            }

            // If attendance exists and is an auto-generated Absent (prefill),
            // treat this incoming mark as the *real* check-in and convert the record.
            if (
                (existingAttendance as any).verify_mode === 'auto' &&
                (existingAttendance as any).status === 'system-generated' &&
                (existingAttendance as any).flag
            ) {
                try {
                    const flagDoc = await this.attendanceFlagModel
                        .findById((existingAttendance as any).flag)
                        .lean()
                        .exec();

                    // Only convert when the existing system-generated flag is 'A' (Absent)
                    if (flagDoc && flagDoc.code === 'A') {
                        // Convert prefilled Absent into a real check-in
                        existingAttendance.in_time = currentTime;
                        existingAttendance.verify_mode =
                            normalizedBody.verifyMode;
                        existingAttendance.status = normalizedBody.status; // e.g. 'check-in'
                        if (normalizedBody.deviceId) {
                            existingAttendance.device_id =
                                normalizedBody.deviceId;
                        }
                        existingAttendance.total_checkins = 1;
                        existingAttendance.out_time = null;
                        existingAttendance.ot_minutes = 0;

                        // Re-evaluate lateness/flag based on actual shift (if available)
                        if (resolved.shift) {
                            await this.evaluateAttendance(
                                existingAttendance as Partial<Attendance>,
                                resolved.shift,
                                deviceUserMapping.employee,
                            );
                        }

                        // Persist and return
                        await existingAttendance.save();
                        return existingAttendance;
                    }
                } catch (err) {
                    this.logger.error(
                        'Failed converting prefilled absent:',
                        err as Error,
                    );
                    // fall through to normal subsequent-check-in logic below
                }
            }

            // Existing attendance found - this is a subsequent check-in (update out_time)
            // Prevent accidental duplicate scans within 2 minutes
            const lastScanTime =
                existingAttendance.out_time || existingAttendance.in_time;
            const diffMinutes = moment
                .tz(currentTime, 'Asia/Dhaka')
                .diff(moment.tz(lastScanTime, 'Asia/Dhaka'), 'minutes');

            if (diffMinutes < 2) {
                this.logger.warn(
                    `Ignoring duplicate scan within 2 minutes for user ${normalizedBody.userId}`,
                );
                return existingAttendance;
            }

            // Update out_time (second, third, ... check-ins all update out_time)
            existingAttendance.out_time = currentTime;
            existingAttendance.total_checkins =
                (existingAttendance.total_checkins || 1) + 1;

            // Calculate and update OT
            const otMinutes = await this.calculateAttendanceOT(
                existingAttendance,
                existingAttendance.shift_date,
                deviceUserMapping.employee,
            );
            existingAttendance.ot_minutes = otMinutes;

            return await existingAttendance.save();
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to mark attendance', err as Error);
            throw new InternalServerErrorException(
                'Unable to mark attendance at this time',
            );
        }
    }

    async updateAttendance(
        attendanceId: string,
        attendanceData: Partial<CreateAttendanceBodyDto>,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'admin:edit_attendance',
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
            const updated = await this.attendanceModel
                .findByIdAndUpdate(attendanceId, { $set: patch }, { new: true })
                .exec();
            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update attendance record',
                );
            }

            // Recalculate OT if times were updated
            if (attendanceData.inTime || attendanceData.outTime) {
                const otMinutes = await this.calculateAttendanceOT(
                    updated,
                    updated.shift_date,
                    updated.employee,
                );
                updated.ot_minutes = otMinutes;
                await updated.save();
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
            'admin:delete_attendance',
            userSession.permissions,
        );

        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete attendance records",
            );
        }

        const existing = await this.attendanceModel
            .findById(attendanceId)
            .populate('flag')
            .exec();

        if (!existing) {
            throw new BadRequestException('Attendance record not found');
        }

        const currentFlag = existing.flag as any;
        if (currentFlag && currentFlag.code === 'A') {
            throw new BadRequestException(
                'This attendance record is already marked as Absent',
            );
        }

        try {
            // Revert to "Absent" Instead of Deleting
            const absentFlag = await this.getFlagByCode('A');
            const systemStatus =
                ATTENDANCE_STATUSES.find(
                    s => (s as string) === 'system-generated',
                ) ?? ATTENDANCE_STATUSES[0];

            let dummyInTime: Date | null = null;
            let dummyOutTime: Date | null = null;

            // Resolve shift to display dummy times mimicking a Leave record
            const resolvedShift = await this.resolveShiftForDate(
                existing.employee,
                existing.shift_date,
            );
            if (
                resolvedShift &&
                resolvedShift.shift_start &&
                resolvedShift.shift_end
            ) {
                const shiftStartStr = `${moment.tz(existing.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')} ${resolvedShift.shift_start}`;
                dummyInTime = moment
                    .tz(shiftStartStr, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka')
                    .toDate();

                const shiftEndStr = `${moment.tz(existing.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')} ${resolvedShift.shift_end}`;
                let outTimeMoment = moment.tz(
                    shiftEndStr,
                    'YYYY-MM-DD HH:mm',
                    'Asia/Dhaka',
                );

                if (resolvedShift.crosses_midnight) {
                    outTimeMoment = outTimeMoment.add(1, 'day');
                }
                dummyOutTime = outTimeMoment.toDate();
            } else {
                // Fallback dummy times if no shift is resolved
                const startOfDayStr = `${moment.tz(existing.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')}`;
                dummyInTime = moment
                    .tz(
                        `${startOfDayStr} 09:00`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
                dummyOutTime = moment
                    .tz(
                        `${startOfDayStr} 17:00`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
            }

            await existing.updateOne({
                $set: {
                    flag: absentFlag?._id,
                    in_time: dummyInTime,
                    out_time: dummyOutTime,
                    ot_minutes: 0,
                    late_minutes: 0,
                    status: systemStatus,
                    verify_mode: 'manual',
                    in_remark: 'Absent (Record deleted)',
                    out_remark: 'Absent (Record deleted)',
                },
            });

            return {
                message: 'Attendance record reverted to Absent successfully',
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete attendance record', err);
            throw new InternalServerErrorException(
                'Unable to delete attendance record at this time',
            );
        }
    }

    async searchAttendance(
        filters: SearchAttendanceBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        const canView = hasPerm(
            'accountancy:manage_employee',
            userSession.permissions,
        );

        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view attendance records",
            );
        }

        try {
            const today = moment.tz('Asia/Dhaka');
            const from = filters.fromDate
                ? moment.tz(filters.fromDate, 'Asia/Dhaka').startOf('day')
                : today.clone().startOf('day');
            const to = filters.toDate
                ? moment.tz(filters.toDate, 'Asia/Dhaka').endOf('day')
                : filters.fromDate
                  ? moment.tz(filters.fromDate, 'Asia/Dhaka').endOf('day')
                  : today.clone().endOf('day');
            if (!from.isValid() || !to.isValid()) {
                throw new BadRequestException('Invalid from/to date');
            }

            const page = pagination.paginated ? pagination.page : 1;
            const limit = pagination.paginated ? pagination.itemsPerPage : 1000;
            const skip = (page - 1) * limit;

            const employeeQuery: Record<string, unknown> = filters.employeeId
                ? { _id: filters.employeeId }
                : { status: 'active' };

            if (filters.department) {
                employeeQuery.department = filters.department;
            }

            const [employees, employeeCount] = await Promise.all([
                this.employeeModel
                    .find(employeeQuery)
                    .select(
                        'real_name e_id designation department status branch',
                    )
                    .sort({ e_id: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.employeeModel.countDocuments(employeeQuery),
            ]);

            if (!employees.length) {
                return {
                    pagination: {
                        count: employeeCount,
                        pageCount: Math.ceil(employeeCount / limit),
                    },
                    items: [],
                };
            }

            const employeeIds = employees.map(e => e._id);
            const fromDate = from.toDate();
            const toDate = to.toDate();

            const [attendanceRows, leaveRows, holidayRows, departments] =
                await Promise.all([
                    this.attendanceModel
                        .find({
                            employee: { $in: employeeIds },
                            shift_date: { $gte: fromDate, $lte: toDate },
                        })
                        .populate('flag')
                        .sort({ createdAt: -1 })
                        .lean()
                        .exec(),
                    this.leaveRequestModel
                        .find({
                            employee: { $in: employeeIds },
                            status: 'approved',
                            start_date: { $lte: toDate },
                            end_date: { $gte: fromDate },
                        })
                        .lean()
                        .exec(),
                    this.holidayModel
                        .find({
                            dateFrom: { $lte: toDate },
                            dateTo: { $gte: fromDate },
                        })
                        .lean()
                        .exec(),
                    this.departmentModel.find().lean().exec(),
                ]);

            const departmentWeekendMap = new Map<string, number[]>();
            departments.forEach(dept => {
                departmentWeekendMap.set(
                    dept.name.trim().toLowerCase(),
                    dept.weekend_days || [0],
                );
            });

            // --- Shift Memory Queries ---
            // Bulk fetch active plans for all employees
            const allPlans = await this.shiftPlanModel
                .find({
                    employee: { $in: employeeIds },
                    $or: [
                        { effective_to: { $gte: fromDate } },
                        { effective_to: null },
                    ],
                })
                .lean()
                .exec();

            const planMap = new Map<string, ShiftPlan[]>();
            allPlans.forEach(t => {
                const empId = String(t.employee);
                if (!planMap.has(empId)) planMap.set(empId, []);
                planMap.get(empId)!.push(t);
            });

            // Bulk fetch adjustments for all employees within queried dates
            const allAdjustments = await this.shiftAdjustmentModel
                .find({
                    employee: { $in: employeeIds },
                    shift_date: { $gte: fromDate, $lte: toDate },
                })
                .lean()
                .exec();

            const adjustmentMap = new Map<string, any>();
            allAdjustments.forEach(o => {
                const key = `${String(o.employee)}_${moment.tz(o.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')}`;
                adjustmentMap.set(key, o);
            });

            // Helper to get raw shift memory times synchronously
            const getDummyShiftTimes = (
                employeeIdStr: string,
                dateKey: string,
            ) => {
                const dateMom = moment.tz(dateKey, 'YYYY-MM-DD', 'Asia/Dhaka');
                const adjustmentKey = `${employeeIdStr}_${dateKey}`;
                const adjustment = adjustmentMap.get(adjustmentKey);

                if (adjustment && adjustment.adjustment_type !== 'cancel') {
                    return {
                        start: adjustment.shift_start || '09:00',
                        end: adjustment.shift_end || '17:00',
                    };
                }
                if (adjustment && adjustment.adjustment_type === 'cancel') {
                    // For cancellations, fallback to typical times
                    return { start: '09:00', end: '17:00' };
                }
                const empsPlans = planMap.get(employeeIdStr) || [];
                // find active plan
                const plan = empsPlans.find(t => {
                    const fromMom = moment
                        .tz(t.effective_from, 'Asia/Dhaka')
                        .startOf('day');
                    const toMom = t.effective_to
                        ? moment.tz(t.effective_to, 'Asia/Dhaka').endOf('day')
                        : moment.tz('2099-12-31', 'Asia/Dhaka');
                    return dateMom.isBetween(fromMom, toMom, 'day', '[]');
                });
                if (plan) {
                    return {
                        start: plan.shift_start || '09:00',
                        end: plan.shift_end || '17:00',
                    };
                }

                return { start: '09:00', end: '17:00' };
            };
            // ------------------

            const employeeMap = new Map<string, any>();
            employees.forEach(emp => {
                employeeMap.set(emp._id.toString(), emp);
            });

            const attendanceByKey = new Map<string, any>();
            const dateToKey = (date: Date) =>
                moment.tz(date, 'Asia/Dhaka').format('YYYY-MM-DD');

            const checkinPriority = (row: any): number => {
                const code = row?.flag?.code || '';
                if (row?.verify_mode !== 'auto') return 100;
                if (code === 'P' || code === 'D' || code === 'E') return 90;
                if (code === 'L') return 40;
                if (code === 'H') return 30;
                if (code === 'W') return 20;
                if (code === 'A') return 10;
                return 0;
            };

            for (const row of attendanceRows) {
                const key = `${String(row.employee)}_${dateToKey(row.shift_date)}`;
                const existing = attendanceByKey.get(key);
                if (
                    !existing ||
                    checkinPriority(row) > checkinPriority(existing)
                ) {
                    attendanceByKey.set(key, row);
                }
            }

            const leaveDateSetByEmployee = new Map<string, Set<string>>();

            const dates: string[] = [];
            for (
                let cursor = from.clone().startOf('day');
                cursor.isSameOrBefore(to, 'day');
                cursor.add(1, 'day')
            ) {
                dates.push(cursor.format('YYYY-MM-DD'));
            }
            const dateSet = new Set(dates);

            const holidayDateSet = new Set<string>();
            holidayRows.forEach(holiday => {
                const hStart = moment
                    .tz(holiday.dateFrom, 'Asia/Dhaka')
                    .startOf('day');
                const hEnd = moment
                    .tz(holiday.dateTo, 'Asia/Dhaka')
                    .endOf('day');

                for (
                    const dayCursor = hStart.clone();
                    dayCursor.isSameOrBefore(hEnd, 'day');
                    dayCursor.add(1, 'day')
                ) {
                    const key = dayCursor.format('YYYY-MM-DD');
                    if (dateSet.has(key)) {
                        holidayDateSet.add(key);
                    }
                }
            });

            leaveRows.forEach(leave => {
                const employeeId = String(leave.employee);
                const set =
                    leaveDateSetByEmployee.get(employeeId) || new Set<string>();

                const lStart = moment
                    .tz(leave.start_date, 'Asia/Dhaka')
                    .startOf('day');
                const lEnd = moment
                    .tz(leave.end_date, 'Asia/Dhaka')
                    .endOf('day');

                for (
                    const dayCursor = lStart.clone();
                    dayCursor.isSameOrBefore(lEnd, 'day');
                    dayCursor.add(1, 'day')
                ) {
                    const key = dayCursor.format('YYYY-MM-DD');
                    if (dateSet.has(key)) {
                        set.add(key);
                    }
                }

                leaveDateSetByEmployee.set(employeeId, set);
            });

            const resolveVirtualCode = (
                employee: { _id: Types.ObjectId; department?: string },
                dateKey: string,
            ): string => {
                const employeeId = employee._id.toString();

                const leaveDateSet = leaveDateSetByEmployee.get(employeeId);
                if (leaveDateSet?.has(dateKey)) return 'L';

                if (holidayDateSet.has(dateKey)) return 'H';

                const weekendDays = departmentWeekendMap.get(
                    (employee.department || '').trim().toLowerCase(),
                ) || [0];
                const dayOfWeek = moment
                    .tz(dateKey, 'YYYY-MM-DD', 'Asia/Dhaka')
                    .day();
                if (weekendDays.includes(dayOfWeek)) return 'W';

                return 'A';
            };

            const precedence = new Map<string, number>([
                ['P', 100],
                ['D', 95],
                ['E', 90],
                ['L', 40],
                ['H', 30],
                ['W', 20],
                ['A', 10],
            ]);

            const groupedItems: {
                employee: (typeof employees)[number];
                records: Record<string, unknown>[];
            }[] = [];

            for (const employee of employees) {
                const records: Record<string, unknown>[] = [];
                for (const dateKey of dates) {
                    const key = `${employee._id.toString()}_${dateKey}`;
                    const existing = attendanceByKey.get(key);
                    const existingCode = (existing?.flag?.code as string) || '';
                    const virtualCode = resolveVirtualCode(employee, dateKey);

                    const existingRank = precedence.get(existingCode) || 0;
                    const virtualRank = precedence.get(virtualCode) || 0;

                    if (existing && existingRank >= virtualRank) {
                        // Apply dummy times to finalized auto-generated records that don't have time
                        let inTime = existing.in_time;
                        let outTime = existing.out_time;

                        if (
                            existing.verify_mode === 'auto' &&
                            (!inTime || !outTime)
                        ) {
                            const { start, end } = getDummyShiftTimes(
                                employee._id.toString(),
                                dateKey,
                            );
                            if (!inTime) {
                                inTime = moment
                                    .tz(
                                        `${dateKey} ${start}`,
                                        'YYYY-MM-DD HH:mm',
                                        'Asia/Dhaka',
                                    )
                                    .toDate();
                            }
                            if (!outTime) {
                                outTime = moment
                                    .tz(
                                        `${dateKey} ${end}`,
                                        'YYYY-MM-DD HH:mm',
                                        'Asia/Dhaka',
                                    )
                                    .toDate();
                            }
                        }

                        records.push({
                            ...(existing as Record<string, unknown>),
                            in_time: inTime,
                            out_time: outTime,
                            is_virtual: false,
                        });
                    } else {
                        const shiftDate = moment
                            .tz(dateKey, 'YYYY-MM-DD', 'Asia/Dhaka')
                            .startOf('day')
                            .toDate();

                        // Construct proper dummy times
                        const { start, end } = getDummyShiftTimes(
                            employee._id.toString(),
                            dateKey,
                        );
                        const vInTime = moment
                            .tz(
                                `${dateKey} ${start}`,
                                'YYYY-MM-DD HH:mm',
                                'Asia/Dhaka',
                            )
                            .toDate();
                        const vOutTime = moment
                            .tz(
                                `${dateKey} ${end}`,
                                'YYYY-MM-DD HH:mm',
                                'Asia/Dhaka',
                            )
                            .toDate();

                        records.push({
                            _id: `virtual_${employee._id.toString()}_${dateKey}`,
                            shift_date: shiftDate,
                            in_time: vInTime,
                            out_time: vOutTime,
                            in_remark: `Virtual ${virtualCode}`,
                            out_remark: '',
                            ot_minutes: 0,
                            verify_mode: 'auto',
                            status: 'system-generated',
                            flag: {
                                _id: new Types.ObjectId(),
                                code: virtualCode,
                                color:
                                    virtualCode === 'L'
                                        ? '#16a34a'
                                        : virtualCode === 'H'
                                          ? '#0ea5e9'
                                          : virtualCode === 'W'
                                            ? '#f59e0b'
                                            : '#ef4444',
                            },
                            is_virtual: true,
                        });
                    }
                }

                records.sort((a, b) => {
                    const aDate = moment
                        .tz((a.shift_date || a.in_time) as Date, 'Asia/Dhaka')
                        .valueOf();
                    const bDate = moment
                        .tz((b.shift_date || b.in_time) as Date, 'Asia/Dhaka')
                        .valueOf();
                    return aDate - bDate; // Sort chronologically
                });

                groupedItems.push({
                    employee,
                    records,
                });
            }

            const response = {
                pagination: {
                    count: employeeCount,
                    pageCount: Math.ceil(employeeCount / limit),
                },
                items: groupedItems,
            };

            if (!pagination.paginated) {
                return response.items;
            }

            return response;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to search attendance records', err);
            throw new InternalServerErrorException(
                'Unable to search attendance records at this time',
            );
        }
    }
}
