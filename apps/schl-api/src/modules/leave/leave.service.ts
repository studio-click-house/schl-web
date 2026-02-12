import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    ATTENDANCE_STATUSES,
    DEFAULT_DEVICE_ID,
    DEFAULT_SOURCE_IP,
} from '@repo/common/constants/attendance.constant';
import {
    AttendanceFlag,
    AttendanceFlagDocument,
} from '@repo/common/models/attendance-flag.schema';
import {
    Attendance,
    AttendanceDocument,
} from '@repo/common/models/attendance.schema';
import {
    Department,
    DepartmentDocument,
} from '@repo/common/models/department.schema';
import {
    DeviceUser,
    DeviceUserDocument,
} from '@repo/common/models/device-user.schema';
import {
    Employee,
    EmployeeDocument,
} from '@repo/common/models/employee.schema';
import { Holiday, HolidayDocument } from '@repo/common/models/holiday.schema';
import { Leave, LeaveDocument } from '@repo/common/models/leave.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { FilterQuery, Model, Types } from 'mongoose';
import { toObjectId } from '../../common/utils/id-helpers.utils';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateLeaveDto } from './dto/create-leave.dto';

@Injectable()
export class LeaveService {
    constructor(
        @InjectModel(Leave.name)
        private leaveModel: Model<LeaveDocument>,
        @InjectModel(AttendanceFlag.name)
        private flagModel: Model<AttendanceFlagDocument>,
        @InjectModel(Attendance.name)
        private attendanceModel: Model<AttendanceDocument>,
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUserDocument>,
        @InjectModel(Employee.name)
        private employeeModel: Model<EmployeeDocument>,
        @InjectModel(Department.name)
        private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
        private attendanceService: AttendanceService,
    ) {}

    async findAll(
        employeeId?: string,
        fromDate?: string,
        toDate?: string,
        isPaid?: boolean,
        leaveType?: string,
        status?: string,
        _userSession?: UserSession,
    ) {
        // Reference _userSession to avoid unused-var lint warnings
        void _userSession;

        const query: FilterQuery<LeaveDocument> = {};
        if (employeeId) query.employee = toObjectId(employeeId) as any;
        if (status) query.status = status;

        // Filter by paid/unpaid if provided (expect boolean)
        if (isPaid !== undefined) query.is_paid = isPaid as any;

        if (leaveType) query.leave_type = leaveType as any;

        // Date range intersection: leave.start_date <= to && leave.end_date >= from
        if (fromDate || toDate) {
            const start = fromDate
                ? moment
                      .tz(fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .startOf('day')
                      .toDate()
                : undefined;
            const end = toDate
                ? moment
                      .tz(toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .endOf('day')
                      .toDate()
                : undefined;

            if (start && end) {
                query.$or = [
                    { start_date: { $gte: start, $lte: end } },
                    { end_date: { $gte: start, $lte: end } },
                    { start_date: { $lte: start }, end_date: { $gte: end } },
                ] as any;
            } else if (start) {
                query.end_date = { $gte: start } as any;
            } else if (end) {
                query.start_date = { $lte: end } as any;
            }
        }

        return await this.leaveModel
            .find(query)
            .populate('employee', 'real_name')
            .populate('flag')
            .sort({ start_date: -1 })
            .exec();
    }

    /**
     * Search leaves with optional pagination. Returns paginated result when pagination.paginated is true,
     * otherwise returns all matching items in `items` with pagination metadata.
     */
    async searchLeaves(
        filters: Partial<{
            employeeId?: string;
            fromDate?: string;
            toDate?: string;
            isPaid?: boolean | null;
            leaveType?: string;
            status?: string;
        }>,
        pagination: { page: number; itemsPerPage: number; paginated: boolean },
        _userSession?: UserSession,
    ) {
        void _userSession;
        const { page, itemsPerPage, paginated } = pagination;

        const query: FilterQuery<LeaveDocument> = {};
        if (filters.employeeId)
            query.employee = toObjectId(filters.employeeId) as any;
        if (filters.status) query.status = filters.status as any;
        if (typeof filters.isPaid === 'boolean')
            query.is_paid = filters.isPaid as any;
        if (filters.leaveType) query.leave_type = filters.leaveType as any;

        if (filters.fromDate || filters.toDate) {
            const start = filters.fromDate
                ? moment
                      .tz(filters.fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .startOf('day')
                      .toDate()
                : undefined;
            const end = filters.toDate
                ? moment
                      .tz(filters.toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .endOf('day')
                      .toDate()
                : undefined;

            if (start && end) {
                query.$or = [
                    { start_date: { $gte: start, $lte: end } },
                    { end_date: { $gte: start, $lte: end } },
                    { start_date: { $lte: start }, end_date: { $gte: end } },
                ] as any;
            } else if (start) {
                query.end_date = { $gte: start } as any;
            } else if (end) {
                query.start_date = { $lte: end } as any;
            }
        }

        const skip = (page - 1) * itemsPerPage;
        const count = await this.leaveModel.countDocuments(query).exec();

        const items = await this.leaveModel
            .find(query)
            .populate('employee', 'real_name')
            .populate('flag')
            .sort({ start_date: -1 })
            .skip(paginated ? skip : 0)
            .limit(paginated ? itemsPerPage : 0)
            .exec();

        return {
            items,
            pagination: {
                count,
                pageCount: Math.ceil(count / itemsPerPage) || 0,
            },
        };
    }

    async apply(dto: CreateLeaveDto, _userSession?: UserSession) {
        // Reference _userSession to avoid unused-var lint warnings
        void _userSession;
        // Validate dates
        const start = moment
            .tz(dto.startDate, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const end = moment
            .tz(dto.endDate, 'Asia/Dhaka')
            .startOf('day')
            .toDate();

        if (end < start) {
            throw new BadRequestException(
                'End date cannot be before start date',
            );
        }

        // Determine the AttendanceFlag for Leave (code === 'L') on the server side
        const leaveFlag = await this.flagModel.findOne({ code: 'L' }).exec();
        if (!leaveFlag) {
            throw new BadRequestException(
                'No attendance flag with code L configured',
            );
        }

        return await this.leaveModel.create({
            employee: dto.employeeId,
            flag: leaveFlag._id,
            leave_type: dto.leaveType,
            is_paid: dto.isPaid,
            start_date: start,
            end_date: end,
            reason: dto.reason,
            status: dto.status ?? 'pending',
        });
    }

    async updateStatus(
        id: string,
        status: 'approved' | 'rejected',
        userSession: UserSession,
    ) {
        if (!hasPerm('accountancy:manage_employee', userSession.permissions)) {
            // Fallback default perm
            if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
                throw new ForbiddenException('Permission denied');
            }
        }

        // Fetch existing leave first so we can determine previous status and dates
        const existingLeave = await this.leaveModel.findById(id).exec();
        if (!existingLeave)
            throw new NotFoundException('Leave request not found');

        const updated = await this.leaveModel.findByIdAndUpdate(
            id,
            {
                status: status,
                approved_by: userSession.db_id,
            },
            { new: true },
        );

        if (!updated) throw new NotFoundException('Leave request not found');

        // If status changed to approved now (was not approved earlier), apply to attendance
        if (status === 'approved' && existingLeave.status !== 'approved') {
            // run in background (don't block) but await to ensure deterministic behavior here
            await this.applyApprovedLeaveToAttendance(updated);
        }

        return updated;
    }

    async update(
        id: string,
        dto: import('./dto/create-leave.dto').UpdateLeaveDto,
        _userSession?: UserSession,
    ) {
        // Only allow editing pending leaves
        const leave = await this.leaveModel.findById(id).exec();
        if (!leave) throw new NotFoundException('Leave request not found');
        if (leave.status !== 'pending') {
            throw new BadRequestException('Only pending leaves can be edited');
        }

        // If dates provided, validate
        let start = leave.start_date;
        let end = leave.end_date;
        if (dto.startDate) {
            start = moment
                .tz(dto.startDate, 'Asia/Dhaka')
                .startOf('day')
                .toDate();
        }
        if (dto.endDate) {
            end = moment.tz(dto.endDate, 'Asia/Dhaka').startOf('day').toDate();
        }
        if (end < start) {
            throw new BadRequestException(
                'End date cannot be before start date',
            );
        }

        const updatePayload: any = {};
        if (dto.employeeId) updatePayload.employee = dto.employeeId;
        if (dto.leaveType) updatePayload.leave_type = dto.leaveType;
        if (typeof dto.isPaid === 'boolean') updatePayload.is_paid = dto.isPaid;
        if (dto.startDate) updatePayload.start_date = start;
        if (dto.endDate) updatePayload.end_date = end;
        if (dto.reason) updatePayload.reason = dto.reason;
        if (dto.status) updatePayload.status = dto.status;

        const updated = await this.leaveModel.findByIdAndUpdate(
            id,
            updatePayload,
            { new: true },
        );
        return updated;
    }

    async remove(id: string, _userSession?: UserSession) {
        const leave = await this.leaveModel.findByIdAndDelete(id).exec();
        if (!leave) throw new NotFoundException('Leave request not found');
        return { success: true };
    }

    // Apply an approved leave to attendance records for its date range
    private async applyApprovedLeaveToAttendance(leave: LeaveDocument) {
        const start = moment(leave.start_date).tz('Asia/Dhaka').startOf('day');
        const end = moment(leave.end_date).tz('Asia/Dhaka').startOf('day');

        const flagId = (leave as any).flag as Types.ObjectId | undefined;
        const employeeId = (leave as any).employee as Types.ObjectId;

        // iterate each date in the range
        for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'day')) {
            const shiftDate = m.startOf('day').toDate();

            // find existing attendance for that date
            const existing = await this.attendanceModel.findOne({
                employee: employeeId,
                shift_date: shiftDate,
            });

            // If existing attendance is manual/device-generated — do not overwrite
            if (existing && (existing as any).verify_mode !== 'auto') {
                // skip and continue
                continue;
            }

            // If this date is a Holiday, skip — holiday takes priority over Leave for attendance
            const holiday = await this.holidayModel
                .findOne({
                    dateFrom: { $lte: shiftDate },
                    dateTo: { $gte: shiftDate },
                })
                .exec();
            if (holiday) continue;

            // If this date is a Weekend for the employee's department, skip — weekend takes priority over Leave
            const emp = await this.employeeModel
                .findById(employeeId)
                .lean()
                .exec();
            const deptName = emp?.department
                ? emp.department.trim().toLowerCase()
                : '';
            const deptDoc = deptName
                ? await this.departmentModel
                      .findOne({ name: new RegExp(`^${deptName}$`, 'i') })
                      .lean()
                      .exec()
                : null;
            const weekendDays: number[] = (deptDoc && deptDoc.weekend_days) || [
                0,
            ];
            const dayOfWeek = moment(shiftDate).day();
            if (weekendDays.includes(dayOfWeek)) continue;

            // Determine shift times via AttendanceService (if available)
            let inTime: Date;
            let outTime: Date;
            try {
                const shift = await this.attendanceService.resolveShiftForDate(
                    employeeId.toString(),
                    shiftDate,
                );
                const yyyymmdd = moment(shiftDate).format('YYYY-MM-DD');
                const inStr = (shift && shift.shift_start) || '09:00';
                const outStr = (shift && shift.shift_end) || '17:00';
                inTime = moment
                    .tz(
                        `${yyyymmdd} ${inStr}`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
                outTime = moment
                    .tz(
                        `${yyyymmdd} ${outStr}`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
                if (outTime < inTime)
                    outTime = moment(outTime).add(1, 'day').toDate();
            } catch (err) {
                // fallback to 09:00-17:00
                const yyyymmdd = moment(shiftDate).format('YYYY-MM-DD');
                inTime = moment
                    .tz(`${yyyymmdd} 09:00`, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka')
                    .toDate();
                outTime = moment
                    .tz(`${yyyymmdd} 17:00`, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka')
                    .toDate();
            }

            // Decide device/user_id mapping
            const deviceUser = await this.deviceUserModel
                .findOne({ employee: employeeId })
                .exec();
            const userId = deviceUser
                ? deviceUser.user_id
                : `SYS_${employeeId.toString()}`;

            // System-generated attendance payload
            const systemStatus =
                ATTENDANCE_STATUSES.find(
                    s => (s as string) === 'system-generated',
                ) ?? ATTENDANCE_STATUSES[0];

            const payload: Partial<Attendance> = {
                in_time: inTime,
                out_time: outTime,
                shift_date: shiftDate,
                employee: employeeId,
                user_id: userId,
                device_id: DEFAULT_DEVICE_ID,
                source_ip: DEFAULT_SOURCE_IP,
                verify_mode: 'auto',
                status: systemStatus,
                flag: flagId,
                late_minutes: 0,
                out_remark: 'Leave (approved)',
                in_remark: 'Leave (approved)',
            };

            if (existing) {
                await this.attendanceModel.findByIdAndUpdate(existing._id, {
                    $set: payload,
                });
            } else {
                await this.attendanceModel.create(payload as any);
            }
        }
    }
}
