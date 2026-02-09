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
    DEFAULT_DEVICE_ID,
    DEFAULT_SOURCE_IP,
} from '@repo/common/constants/attendance.constant';
import {
    AttendanceFlag,
    AttendanceFlagDocument,
} from '@repo/common/models/attendance-flag.schema';
import { Attendance } from '@repo/common/models/attendance.schema';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { Holiday, HolidayDocument } from '@repo/common/models/holiday.schema';
import { Leave, LeaveDocument } from '@repo/common/models/leave.schema';
import { ShiftOverride } from '@repo/common/models/shift-override.schema';
import { ShiftResolved } from '@repo/common/models/shift-resolved.schema';
import { ShiftTemplate } from '@repo/common/models/shift-template.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    calculateOT,
    determineShiftDate,
} from '@repo/common/utils/ot-calculation';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { Model } from 'mongoose';
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
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUser>,
        @InjectModel(ShiftTemplate.name)
        private shiftTemplateModel: Model<ShiftTemplate>,
        @InjectModel(ShiftOverride.name)
        private shiftOverrideModel: Model<ShiftOverride>,
        @InjectModel(ShiftResolved.name)
        private shiftResolvedModel: Model<ShiftResolved>,
        @InjectModel(Leave.name)
        private leaveModel: Model<LeaveDocument>,
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
        @InjectModel(AttendanceFlag.name)
        private attendanceFlagModel: Model<AttendanceFlagDocument>,
    ) {}

    public async resolveShiftForDate(
        employeeId: any,
        date: Date,
    ): Promise<ShiftResolved | null> {
        const shiftDate = moment.tz(date, 'Asia/Dhaka').startOf('day').toDate();

        const cached = await this.shiftResolvedModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });
        if (cached) return cached;

        const override = await this.shiftOverrideModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });

        if (override) {
            if (override.override_type === 'cancel') {
                return null;
            }

            return await this.shiftResolvedModel.findOneAndUpdate(
                { employee: employeeId, shift_date: shiftDate },
                {
                    $set: {
                        employee: employeeId,
                        shift_date: shiftDate,
                        shift_type: override.shift_type,
                        shift_start: override.shift_start,
                        shift_end: override.shift_end,
                        crosses_midnight: override.crosses_midnight,
                        source: 'override',
                        override_id: override._id,
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );
        }

        // Check for Holidays
        const holiday = await this.holidayModel.findOne({
            date: shiftDate,
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

        // Check for Approved Leaves
        const leave = await this.leaveModel.findOne({
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

        const template = await this.shiftTemplateModel.findOne({
            employee: employeeId,
            active: true,
            effective_from: { $lte: shiftDate },
            effective_to: { $gte: shiftDate },
        });

        if (!template) return null;

        return await this.shiftResolvedModel.findOneAndUpdate(
            { employee: employeeId, shift_date: shiftDate },
            {
                $set: {
                    employee: employeeId,
                    shift_date: shiftDate,
                    shift_type: template.shift_type,
                    shift_start: template.shift_start,
                    shift_end: template.shift_end,
                    crosses_midnight: template.crosses_midnight,
                    source: 'template',
                    template_id: template._id,
                    resolved_at: new Date(),
                },
            },
            { new: true, upsert: true },
        );
    }

    private async evaluateAttendance(
        attendance: Partial<Attendance> | Attendance,
        shift: ShiftResolved,
        employeeId: any,
    ) {
        // 1. Holiday Logic
        if (shift.source === 'holiday') {
            const holiday = await this.holidayModel
                .findOne({ date: shift.shift_date })
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
            const leave = await this.leaveModel
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

        // 3. Regular Shift / Override Logic
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

        // Fetch flags
        // TODO: optimize by caching or fetching all at once
        const extremeDelay = await this.attendanceFlagModel
            .findOne({ code: 'E' })
            .lean();
        const delay = await this.attendanceFlagModel
            .findOne({ code: 'D' })
            .lean();
        const present = await this.attendanceFlagModel
            .findOne({ code: 'P' })
            .lean();

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

    private async resolveShiftForTimestamp(employeeId: any, time: Date) {
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
        employeeId: any,
    ): Promise<number> {
        if (!attendance.out_time) {
            return 0;
        }

        try {
            const resolved = await this.resolveShiftForDate(
                employeeId,
                shiftDate,
            );

            if (!resolved) {
                // No shift plan found, cannot calculate OT
                return 0;
            }

            const otMinutes = calculateOT({
                in_time: attendance.in_time,
                out_time: attendance.out_time,
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

    async createAttendance(
        attendanceData: CreateAttendanceBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_attendance',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create attendance records",
            );
        }

        const deviceUser = await this.deviceUserModel
            .findOne({ employee: attendanceData.employeeId })
            .select('user_id')
            .exec();

        if (!deviceUser?.user_id) {
            throw new BadRequestException(
                'No device user mapping found for the selected employee',
            );
        }

        const lastAttendance = await this.attendanceModel
            .findOne({
                employee: attendanceData.employeeId,
                device_id: { $ne: '' },
            })
            .sort({ in_time: -1 })
            .select('device_id source_ip')
            .lean()
            .exec();

        const resolvedDeviceId =
            lastAttendance?.device_id?.trim() || DEFAULT_DEVICE_ID;
        const resolvedSourceIp =
            lastAttendance?.source_ip?.trim() || DEFAULT_SOURCE_IP;

        const payload = AttendanceFactory.fromCreateDto(attendanceData, {
            deviceId: resolvedDeviceId,
            userId: deviceUser.user_id,
            sourceIp: resolvedSourceIp,
        });
        payload.employee = attendanceData.employeeId as any;

        // Calculate shift_date based on in_time
        const inTime = new Date(attendanceData.inTime);
        const resolved = await this.resolveShiftForTimestamp(
            attendanceData.employeeId,
            inTime,
        );
        const shiftDate = resolved.shiftDate;
        (payload as any).shift_date = shiftDate;

        try {
            const created = await this.attendanceModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create attendance record',
                );
            }

            // Calculate and update OT if out_time is provided
            if (attendanceData.outTime) {
                const otMinutes = await this.calculateAttendanceOT(
                    created,
                    shiftDate,
                    attendanceData.employeeId,
                );
                created.ot_minutes = otMinutes;
                await created.save();
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

    async getEmployeeDeviceUser(employeeId: string, userSession: UserSession) {
        const canCreate = hasPerm(
            'admin:create_attendance',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to view device users",
            );
        }

        try {
            const deviceUser = await this.deviceUserModel
                .findOne({ employee: employeeId })
                .select('user_id employee')
                .exec();

            if (!deviceUser?.user_id) {
                throw new NotFoundException(
                    'No device user mapping found for the selected employee',
                );
            }

            return {
                employeeId: deviceUser.employee?.toString() || employeeId,
                userId: deviceUser.user_id,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to resolve device user by employee', err);
            throw new InternalServerErrorException(
                'Unable to resolve device user for the employee',
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
            const query: Record<string, unknown> = {
                employee: filters.employeeId,
            };

            if (filters.fromDate || filters.toDate) {
                const from = filters.fromDate
                    ? moment.tz(filters.fromDate, 'Asia/Dhaka').startOf('day')
                    : null;
                const to = filters.toDate
                    ? moment.tz(filters.toDate, 'Asia/Dhaka').endOf('day')
                    : null;

                const range: Record<string, Date> = {};
                if (from?.isValid()) range.$gte = from.toDate();
                if (to?.isValid()) range.$lte = to.toDate();

                if (Object.keys(range).length > 0) {
                    query.in_time = range;
                }
            }

            if (!pagination.paginated) {
                const records = await this.attendanceModel
                    .find(query)
                    .populate('flag')
                    .sort({ in_time: -1 })
                    .exec();
                return records;
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const limit = pagination.itemsPerPage;

            const [items, count] = await Promise.all([
                this.attendanceModel
                    .find(query)
                    .populate('flag')
                    .sort({ in_time: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.attendanceModel.countDocuments(query),
            ]);

            const pageCount = Math.ceil(count / limit);

            return {
                pagination: {
                    count,
                    pageCount,
                },
                items,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to search attendance records', err);
            throw new InternalServerErrorException(
                'Unable to search attendance records at this time',
            );
        }
    }
}
