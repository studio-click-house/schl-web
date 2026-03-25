import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
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
import {
    LeaveRequest,
    LeaveRequestDocument,
} from '@repo/common/models/leave-request.schema';
import {
    ShiftAdjustment,
    ShiftAdjustmentDocument,
} from '@repo/common/models/shift-adjustment.schema';
import {
    ShiftPlan,
    ShiftPlanDocument,
} from '@repo/common/models/shift-plan.schema';
import {
    ShiftResolved,
    ShiftResolvedDocument,
} from '@repo/common/models/shift-resolved.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    calculateOT,
    calculateOTFromMinutes,
    determineShiftDate,
    OTResult,
} from '@repo/common/utils/ot-calculation';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { SearchAttendanceBodyDto } from './dto/search-attendance.dto';
import { AttendanceFactory } from './factories/attendance.factory';

/** Typed definition for attendance records with populated flag code */
type AttendancePopulated = Omit<Attendance, 'flag'> & {
    _id: Types.ObjectId;
    employee: Types.ObjectId;
    flag?: AttendanceFlag | { code?: string } | null;
};

/** Lean type for ShiftPlan with ID */
type ShiftPlanLean = ShiftPlan & {
    _id: Types.ObjectId;
    employee: Types.ObjectId;
};

/** Lean type for ShiftAdjustment with ID */
type ShiftAdjustmentLean = ShiftAdjustment & {
    _id: Types.ObjectId;
    employee: Types.ObjectId;
};

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectModel(Attendance.name)
        private readonly attendanceModel: Model<AttendanceDocument>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<EmployeeDocument>,
        @InjectModel(Department.name)
        private readonly departmentModel: Model<DepartmentDocument>,
        @InjectModel(DeviceUser.name)
        private readonly deviceUserModel: Model<DeviceUserDocument>,
        @InjectModel(ShiftPlan.name)
        private readonly shiftPlanModel: Model<ShiftPlanDocument>,
        @InjectModel(ShiftAdjustment.name)
        private readonly shiftAdjustmentModel: Model<ShiftAdjustmentDocument>,
        @InjectModel(ShiftResolved.name)
        private readonly shiftResolvedModel: Model<ShiftResolvedDocument>,
        @InjectModel(LeaveRequest.name)
        private readonly leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(Holiday.name)
        private readonly holidayModel: Model<HolidayDocument>,
        @InjectModel(AttendanceFlag.name)
        private readonly attendanceFlagModel: Model<AttendanceFlagDocument>,
    ) {}

    private flagCache: Record<string, { _id: unknown; code: string } | null> =
        {};

    private async getFlagByCode(
        code: string,
    ): Promise<{ _id: unknown; code: string } | null> {
        if (!this.flagCache[code]) {
            const flag = await this.attendanceFlagModel
                .findOne({ code })
                .lean<{ _id: Types.ObjectId; code: string } | null>()
                .exec();
            this.flagCache[code] = flag;
        }
        return this.flagCache[code];
    }

    public async resolveShiftForDate(
        employeeId: Types.ObjectId | string,
        date: Date,
    ): Promise<ShiftResolvedDocument | null> {
        const shiftDate = moment.tz(date, 'Asia/Dhaka').startOf('day').toDate();
        const cached = await this.shiftResolvedModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });
        if (cached) return cached;

        let shiftData: Partial<ShiftResolved> | null = null;

        const adjustment = await this.shiftAdjustmentModel.findOne({
            employee: employeeId,
            shift_date: shiftDate,
        });
        if (adjustment) {
            if (adjustment.adjustment_type === 'cancel') return null;
            shiftData = {
                shift_type: adjustment.shift_type || 'custom',
                shift_start: adjustment.shift_start || '09:00',
                shift_end: adjustment.shift_end || '17:00',
                crosses_midnight: adjustment.crosses_midnight,
                source: 'adjustment',
                adjustment_id: adjustment._id,
                is_off_day_overtime: adjustment.adjustment_type === 'off_day',
            };
        }

        if (!shiftData) {
            const holiday = await this.holidayModel.findOne({
                $or: [
                    {
                        dateFrom: { $lte: shiftDate },
                        dateTo: { $gte: shiftDate },
                    },
                    { date: shiftDate },
                ],
            });
            if (holiday) {
                shiftData = {
                    shift_type: 'morning',
                    shift_start: '09:00',
                    shift_end: '17:00',
                    crosses_midnight: false,
                    source: 'holiday',
                    is_off_day_overtime: true,
                };
            }
        }

        if (!shiftData) {
            const leave = await this.leaveRequestModel.findOne({
                employee: employeeId,
                status: 'approved',
                start_date: { $lte: shiftDate },
                end_date: { $gte: shiftDate },
            });
            if (leave) {
                shiftData = {
                    shift_type: 'morning',
                    shift_start: '09:00',
                    shift_end: '17:00',
                    crosses_midnight: false,
                    source: 'leave',
                };
            }
        }

        if (!shiftData) {
            const employee = await this.employeeModel
                .findById(employeeId)
                .lean();
            if (employee?.department) {
                const dept = await this.departmentModel
                    .findOne({ name: employee.department })
                    .lean();
                const weekends = dept?.weekend_days || [0];
                if (
                    weekends.includes(moment.tz(shiftDate, 'Asia/Dhaka').day())
                ) {
                    shiftData = {
                        shift_type: 'morning',
                        shift_start: '09:00',
                        shift_end: '17:00',
                        crosses_midnight: false,
                        source: 'plan',
                        is_off_day_overtime: true,
                    };
                }
            }
        }

        if (!shiftData) {
            const plan = await this.shiftPlanModel.findOne({
                employee: employeeId,
                active: true,
                effective_from: { $lte: shiftDate },
                $or: [
                    { effective_to: { $gte: shiftDate } },
                    { effective_to: null },
                ],
            });
            if (plan) {
                shiftData = {
                    shift_type: plan.shift_type,
                    shift_start: plan.shift_start,
                    shift_end: plan.shift_end,
                    crosses_midnight: plan.crosses_midnight,
                    source: 'plan',
                    plan_id: plan._id,
                };
            }
        }

        if (!shiftData) return null;

        return await this.shiftResolvedModel.findOneAndUpdate(
            { employee: employeeId, shift_date: shiftDate },
            {
                $set: {
                    employee: employeeId,
                    shift_date: shiftDate,
                    ...shiftData,
                    resolved_at: new Date(),
                },
            },
            { new: true, upsert: true },
        );
    }

    private async evaluateAttendance(
        attendance: AttendanceDocument | Partial<Attendance>,
        shift: ShiftResolvedDocument | ShiftResolved,
        employeeId: Types.ObjectId | string,
    ) {
        if (shift.source === 'holiday') {
            const holiday = await this.holidayModel
                .findOne({
                    dateFrom: { $lte: shift.shift_date },
                    dateTo: { $gte: shift.shift_date },
                })
                .lean();
            if (holiday) {
                attendance.flag = holiday.flag;
                attendance.late_minutes = 0;
            }
            return;
        }

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
                attendance.flag = leave.flag;
                attendance.late_minutes = 0;
            }
            return;
        }

        if (shift.is_off_day_overtime) {
            const flag = await this.getFlagByCode('P');
            if (flag) attendance.flag = flag._id as Types.ObjectId;
            attendance.late_minutes = 0;
            return;
        }

        if (!attendance.in_time) return;

        const shiftStartStr = `${moment.tz(shift.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')} ${shift.shift_start}`;
        const shiftStart = moment.tz(
            shiftStartStr,
            'YYYY-MM-DD HH:mm',
            'Asia/Dhaka',
        );
        const inTime = moment.tz(attendance.in_time, 'Asia/Dhaka');
        const lateMinutes = Math.max(0, inTime.diff(shiftStart, 'minutes'));
        attendance.late_minutes = lateMinutes;

        const [ext, del, pre] = await Promise.all([
            this.getFlagByCode('E'),
            this.getFlagByCode('D'),
            this.getFlagByCode('P'),
        ]);
        const grace = Number(shift.grace_period_minutes ?? 10);

        if (lateMinutes > 30 && ext)
            attendance.flag = ext._id as Types.ObjectId;
        else if (lateMinutes > grace && del)
            attendance.flag = del._id as Types.ObjectId;
        else if (pre) attendance.flag = pre._id as Types.ObjectId;
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

        return { shift: null, shiftDate: today };
    }

    private validateTimestamp(timestamp: string): Date {
        const parsed = moment.tz(timestamp, 'Asia/Dhaka');
        if (!parsed.isValid()) return moment.tz('Asia/Dhaka').toDate();
        const now = moment.tz('Asia/Dhaka');
        if (Math.abs(now.diff(parsed, 'minutes')) > 5) return now.toDate();
        return parsed.toDate();
    }

    private async calculateAttendanceOT(
        attendance: AttendanceDocument | Attendance,
        shiftDate: Date,
        employeeId: Types.ObjectId | string,
    ): Promise<Partial<Attendance>> {
        if (!attendance.in_time || !attendance.out_time) {
            return {
                ot_minutes: 0,
                extra_work_minutes: 0,
                net_ot_minutes: 0,
                ot_payout: 0,
            };
        }

        try {
            const [resolved, employee] = await Promise.all([
                this.resolveShiftForDate(employeeId, shiftDate),
                this.employeeModel
                    .findById(employeeId)
                    .select('gross_salary')
                    .lean<{ gross_salary: number } | null>()
                    .exec(),
            ]);

            if (!resolved || !employee)
                return {
                    ot_minutes: 0,
                    extra_work_minutes: 0,
                    net_ot_minutes: 0,
                    ot_payout: 0,
                };

            let result: OTResult;
            if (resolved.is_off_day_overtime) {
                const worked = moment
                    .tz(attendance.out_time, 'Asia/Dhaka')
                    .diff(
                        moment.tz(attendance.in_time, 'Asia/Dhaka'),
                        'minutes',
                    );
                result = calculateOTFromMinutes(worked);
            } else {
                result = calculateOT({
                    in_time: attendance.in_time,
                    out_time: attendance.out_time,
                    shift_start: resolved.shift_start,
                    shift_end: resolved.shift_end,
                    shift_date: shiftDate,
                    crosses_midnight: resolved.crosses_midnight,
                });
            }

            const base = Math.trunc((employee.gross_salary * 68) / 100);
            const payout =
                (result.net_ot_minutes / 60) * ((base / 30 / 8) * 1.5);

            return {
                ot_minutes: result.ot_minutes,
                extra_work_minutes: result.extra_work_minutes,
                net_ot_minutes: result.net_ot_minutes,
                ot_payout: Math.round(payout * 100) / 100,
            };
        } catch (err) {
            this.logger.error('OT Calculation Error', err);
            return {
                ot_minutes: 0,
                extra_work_minutes: 0,
                net_ot_minutes: 0,
                ot_payout: 0,
            };
        }
    }

    async markAttendance(body: MarkAttendanceDto) {
        const deviceUser = await this.deviceUserModel
            .findOne({ user_id: body.userId })
            .select('employee')
            .exec();
        if (!deviceUser?.employee)
            throw new InternalServerErrorException(
                `User ID ${body.userId} not mapped to employee`,
            );

        const time = this.validateTimestamp(body.timestamp);
        const { shift, shiftDate } = await this.resolveShiftForTimestamp(
            deviceUser.employee,
            time,
        );

        try {
            const existing = await this.attendanceModel.findOne({
                employee: deviceUser.employee,
                shift_date: shiftDate,
            });
            const devId = body.deviceId?.trim() || DEFAULT_DEVICE_ID;
            const ip = body.sourceIp?.trim() || DEFAULT_SOURCE_IP;

            if (!existing) {
                const payload = AttendanceFactory.fromMarkDto(
                    { ...body, deviceId: devId, sourceIp: ip },
                    time,
                );
                payload.employee = deviceUser.employee;
                payload.shift_date = shiftDate;
                if (shift)
                    await this.evaluateAttendance(
                        payload,
                        shift,
                        deviceUser.employee,
                    );
                return await this.attendanceModel.create(payload);
            }

            if (existing.status === 'system-generated') {
                existing.in_time = time;
                existing.verify_mode = body.verifyMode;
                existing.status = body.status;
                existing.device_id = devId;
                existing.total_checkins = 1;
                if (shift)
                    await this.evaluateAttendance(
                        existing,
                        shift,
                        deviceUser.employee,
                    );
                return await existing.save();
            }

            const last = existing.out_time || existing.in_time;
            if (
                moment
                    .tz(time, 'Asia/Dhaka')
                    .diff(moment.tz(last || time, 'Asia/Dhaka'), 'minutes') < 2
            )
                return existing;

            existing.out_time = time;
            existing.total_checkins = (existing.total_checkins || 1) + 1;
            const ot = await this.calculateAttendanceOT(
                existing,
                existing.shift_date,
                deviceUser.employee,
            );
            Object.assign(existing, ot);
            return await existing.save();
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Attendance marking failed');
        }
    }

    async updateAttendance(
        id: string,
        data: Partial<CreateAttendanceBodyDto>,
        user: UserSession,
    ) {
        if (!hasPerm('admin:edit_attendance', user.permissions))
            throw new ForbiddenException('No permission');
        const existing = await this.attendanceModel.findById(id).exec();
        if (!existing) throw new NotFoundException('Not found');

        try {
            const patch = AttendanceFactory.fromUpdateDto(data);
            const updated = await this.attendanceModel
                .findByIdAndUpdate(id, { $set: patch }, { new: true })
                .exec();
            if (updated && (data.inTime || data.outTime)) {
                const ot = await this.calculateAttendanceOT(
                    updated,
                    updated.shift_date,
                    updated.employee,
                );
                Object.assign(updated, ot);
                await updated.save();
            }
            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Update failed');
        }
    }

    async deleteAttendance(id: string, user: UserSession) {
        if (!hasPerm('admin:delete_attendance', user.permissions))
            throw new ForbiddenException('No permission');
        const existing = await this.attendanceModel.findById(id).exec();
        if (!existing) throw new BadRequestException('Not found');

        try {
            const flag = await this.getFlagByCode('A');
            const shift = await this.resolveShiftForDate(
                existing.employee,
                existing.shift_date,
            );
            const dateStr = moment
                .tz(existing.shift_date, 'Asia/Dhaka')
                .format('YYYY-MM-DD');
            const inTime = moment
                .tz(
                    `${dateStr} ${shift?.shift_start || '09:00'}`,
                    'YYYY-MM-DD HH:mm',
                    'Asia/Dhaka',
                )
                .toDate();
            const outTime = moment
                .tz(
                    `${dateStr} ${shift?.shift_end || '17:00'}`,
                    'YYYY-MM-DD HH:mm',
                    'Asia/Dhaka',
                )
                .toDate();

            await existing.updateOne({
                $set: {
                    flag: flag?._id,
                    in_time: inTime,
                    out_time: outTime,
                    ot_minutes: 0,
                    extra_work_minutes: 0,
                    net_ot_minutes: 0,
                    ot_payout: 0,
                    late_minutes: 0,
                    status: 'system-generated',
                    verify_mode: 'auto',
                    total_checkins: 0,
                },
            });
            return { message: 'Reverted to Absent' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Delete failed');
        }
    }

    async searchAttendance(
        filters: SearchAttendanceBodyDto,
        pagination: { page: number; itemsPerPage: number; paginated: boolean },
        user: UserSession,
    ) {
        const canView =
            hasPerm('admin:view_page', user.permissions) ||
            hasPerm('accountancy:manage_employee', user.permissions);
        if (!canView) throw new ForbiddenException('No permission');

        const from = filters.fromDate
            ? moment.tz(filters.fromDate, 'Asia/Dhaka').startOf('day')
            : moment.tz('Asia/Dhaka').startOf('day');
        const to = filters.toDate
            ? moment.tz(filters.toDate, 'Asia/Dhaka').endOf('day')
            : from.clone().endOf('day');
        const itemsPerPage = pagination.paginated
            ? pagination.itemsPerPage
            : 1000;
        const skip = pagination.paginated
            ? (pagination.page - 1) * itemsPerPage
            : 0;

        const employeeId = filters.employeeId?.trim();
        const employeeQuery: FilterQuery<Employee> = employeeId
            ? { _id: new Types.ObjectId(employeeId) }
            : { status: 'active' };
        if (filters.department) employeeQuery.department = filters.department;

        try {
            const [employees, count] = await Promise.all([
                this.employeeModel
                    .find(employeeQuery)
                    .select(
                        'real_name e_id designation department status branch',
                    )
                    .sort({ e_id: 1 })
                    .skip(skip)
                    .limit(itemsPerPage)
                    .lean()
                    .exec(),
                this.employeeModel.countDocuments(employeeQuery),
            ]);

            if (!employees.length)
                return pagination.paginated
                    ? {
                          pagination: {
                              count,
                              pageCount: Math.ceil(
                                  count / Math.max(1, itemsPerPage),
                              ),
                          },
                          items: [],
                      }
                    : [];

            const eids = employees.map(e => e._id);
            const [attendance, leaves, holidays, depts, flags] =
                await Promise.all([
                    this.attendanceModel
                        .find({
                            employee: { $in: eids },
                            shift_date: {
                                $gte: from.toDate(),
                                $lte: to.toDate(),
                            },
                        })
                        .populate('flag')
                        .sort({ createdAt: -1 })
                        .lean<AttendancePopulated[]>()
                        .exec(),
                    this.leaveRequestModel
                        .find({
                            employee: { $in: eids },
                            status: 'approved',
                            start_date: { $lte: to.toDate() },
                            end_date: { $gte: from.toDate() },
                        })
                        .lean<LeaveRequest[]>()
                        .exec(),
                    this.holidayModel
                        .find({
                            dateFrom: { $lte: to.toDate() },
                            dateTo: { $gte: from.toDate() },
                        })
                        .lean<Holiday[]>()
                        .exec(),
                    this.departmentModel.find().lean<Department[]>().exec(),
                    this.attendanceFlagModel
                        .find()
                        .lean<AttendanceFlag[]>()
                        .exec(),
                ]);

            const flagMap = new Map(flags.map(f => [f.code, f]));
            const weekendMap = new Map(
                depts.map(d => [
                    d.name.trim().toLowerCase(),
                    d.weekend_days || [0],
                ]),
            );
            const plansMap = new Map<string, ShiftPlanLean[]>();
            const adjMap = new Map<string, ShiftAdjustmentLean>();

            const [allPlans, allAdjs] = await Promise.all([
                this.shiftPlanModel
                    .find({
                        employee: { $in: eids },
                        $or: [
                            { effective_to: { $gte: from.toDate() } },
                            { effective_to: null },
                        ],
                    })
                    .lean<ShiftPlanLean[]>()
                    .exec(),
                this.shiftAdjustmentModel
                    .find({
                        employee: { $in: eids },
                        shift_date: { $gte: from.toDate(), $lte: to.toDate() },
                    })
                    .lean<ShiftAdjustmentLean[]>()
                    .exec(),
            ]);

            allPlans.forEach(p => {
                const id = String(p.employee);
                if (!plansMap.has(id)) plansMap.set(id, []);
                plansMap.get(id)!.push(p);
            });
            allAdjs.forEach(a =>
                adjMap.set(
                    `${String(a.employee)}_${moment.tz(a.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')}`,
                    a,
                ),
            );

            const precedence = new Map([
                ['P', 100],
                ['D', 95],
                ['E', 90],
                ['L', 40],
                ['H', 30],
                ['W', 20],
                ['A', 10],
            ]);
            const getPriority = (row: AttendancePopulated) =>
                row.verify_mode !== 'auto'
                    ? 200
                    : precedence.get(String(row.flag?.code || '')) || 0;
            const recordsMap = new Map<string, AttendancePopulated>();
            attendance.forEach(row => {
                const key = `${String(row.employee)}_${moment.tz(row.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')}`;
                if (
                    !recordsMap.has(key) ||
                    getPriority(row) > getPriority(recordsMap.get(key)!)
                )
                    recordsMap.set(key, row);
            });

            const dates: string[] = [];
            for (
                let c = from.clone();
                c.isSameOrBefore(to, 'day');
                c.add(1, 'day')
            )
                dates.push(c.format('YYYY-MM-DD'));

            const grouped = employees.map(employee => {
                const eid = employee._id.toString();
                const records = dates.map(date => {
                    const key = `${eid}_${date}`;
                    const existing = recordsMap.get(key);
                    let virtual = 'A';
                    if (
                        leaves.some(
                            l =>
                                l.employee.toString() === eid &&
                                moment
                                    .tz(l.start_date, 'Asia/Dhaka')
                                    .startOf('day')
                                    .isSameOrBefore(
                                        moment.tz(
                                            date,
                                            'YYYY-MM-DD',
                                            'Asia/Dhaka',
                                        ),
                                    ) &&
                                moment
                                    .tz(l.end_date, 'Asia/Dhaka')
                                    .endOf('day')
                                    .isSameOrAfter(
                                        moment.tz(
                                            date,
                                            'YYYY-MM-DD',
                                            'Asia/Dhaka',
                                        ),
                                    ),
                        )
                    )
                        virtual = 'L';
                    else if (
                        holidays.some(
                            h =>
                                moment
                                    .tz(h.dateFrom, 'Asia/Dhaka')
                                    .startOf('day')
                                    .isSameOrBefore(
                                        moment.tz(
                                            date,
                                            'YYYY-MM-DD',
                                            'Asia/Dhaka',
                                        ),
                                    ) &&
                                moment
                                    .tz(h.dateTo, 'Asia/Dhaka')
                                    .endOf('day')
                                    .isSameOrAfter(
                                        moment.tz(
                                            date,
                                            'YYYY-MM-DD',
                                            'Asia/Dhaka',
                                        ),
                                    ),
                        )
                    )
                        virtual = 'H';
                    else if (
                        (
                            weekendMap.get(
                                (employee.department || '')
                                    .trim()
                                    .toLowerCase(),
                            ) || [0]
                        ).includes(
                            moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka').day(),
                        )
                    )
                        virtual = 'W';

                    if (
                        existing &&
                        (precedence.get(String(existing.flag?.code || '')) ||
                            0) >= (precedence.get(virtual) || 0)
                    ) {
                        let { in_time, out_time } = existing;
                        if (
                            existing.verify_mode === 'auto' &&
                            (!in_time || !out_time)
                        ) {
                            const { start, end } = this.getDummyTimes(
                                eid,
                                date,
                                plansMap,
                                adjMap,
                            );
                            in_time =
                                in_time ||
                                moment
                                    .tz(
                                        `${date} ${start}`,
                                        'YYYY-MM-DD HH:mm',
                                        'Asia/Dhaka',
                                    )
                                    .toDate();
                            out_time =
                                out_time ||
                                moment
                                    .tz(
                                        `${date} ${end}`,
                                        'YYYY-MM-DD HH:mm',
                                        'Asia/Dhaka',
                                    )
                                    .toDate();
                        }
                        return {
                            ...existing,
                            in_time,
                            out_time,
                            is_virtual: false,
                        };
                    }

                    const { start, end } = this.getDummyTimes(
                        eid,
                        date,
                        plansMap,
                        adjMap,
                    );
                    return {
                        _id: `v_${eid}_${date}`,
                        shift_date: moment.tz(date, 'Asia/Dhaka').toDate(),
                        in_time: moment
                            .tz(
                                `${date} ${start}`,
                                'YYYY-MM-DD HH:mm',
                                'Asia/Dhaka',
                            )
                            .toDate(),
                        out_time: moment
                            .tz(
                                `${date} ${end}`,
                                'YYYY-MM-DD HH:mm',
                                'Asia/Dhaka',
                            )
                            .toDate(),
                        verify_mode: 'auto',
                        status: 'system-generated',
                        flag: flagMap.get(virtual) || { code: virtual },
                        is_virtual: true,
                        ot_minutes: 0,
                        extra_work_minutes: 0,
                        net_ot_minutes: 0,
                        ot_payout: 0,
                    };
                });
                return { employee, records };
            });

            const result = {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items: grouped,
            };
            return pagination.paginated ? result : result.items;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(
                'Unable to retrieve attendance',
            );
        }
    }

    private getDummyTimes(
        eid: string,
        date: string,
        plans: Map<string, ShiftPlanLean[]>,
        adjs: Map<string, ShiftAdjustmentLean>,
    ) {
        const adj = adjs.get(`${eid}_${date}`);
        if (adj && adj.adjustment_type !== 'cancel')
            return {
                start: adj.shift_start || '09:00',
                end: adj.shift_end || '17:00',
            };
        const p = (plans.get(eid) || []).find(p => {
            const start = moment
                .tz(p.effective_from, 'Asia/Dhaka')
                .startOf('day');
            const end = p.effective_to
                ? moment.tz(p.effective_to, 'Asia/Dhaka').endOf('day')
                : moment.tz('2099-12-31', 'Asia/Dhaka');
            return moment
                .tz(date, 'YYYY-MM-DD', 'Asia/Dhaka')
                .isBetween(start, end, 'day', '[]');
        });
        return {
            start: p?.shift_start || '09:00',
            end: p?.shift_end || '17:00',
        };
    }
}
