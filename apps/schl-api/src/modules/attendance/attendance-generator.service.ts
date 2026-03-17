import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import type { AttendanceStatus } from '@repo/common/constants/attendance.constant';
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
    ShiftOverride,
    ShiftOverrideDocument,
} from '@repo/common/models/shift-override.schema';
import moment from 'moment-timezone';
import { Model, Types } from 'mongoose';
import { AttendanceService } from './attendance.service';

@Injectable()
export class AttendanceGeneratorService {
    private readonly logger = new Logger(AttendanceGeneratorService.name);

    constructor(
        @InjectModel(Employee.name)
        private employeeModel: Model<EmployeeDocument>,
        @InjectModel(Attendance.name)
        private attendanceModel: Model<AttendanceDocument>,
        @InjectModel(LeaveRequest.name)
        private leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(Department.name)
        private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
        @InjectModel(AttendanceFlag.name)
        private attendanceFlagModel: Model<AttendanceFlagDocument>,
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUserDocument>,
        @InjectModel(ShiftOverride.name)
        private shiftOverrideModel: Model<ShiftOverrideDocument>,
        private attendanceService: AttendanceService,
    ) {}

    // Run every day at 11:55 PM (Asia/Dhaka)
    @Cron('55 23 * * *', { timeZone: 'Asia/Dhaka' })
    async handleDailyGeneration() {
        this.logger.log('Starting daily attendance generation...');
        const today = moment().tz('Asia/Dhaka').toDate();
        await this.generateForDate(today);
        this.logger.log('Daily attendance generation completed.');
    }

    /**
     * Prefill Absent (A) records at the start of the given date for employees
     * who are expected to work (i.e. NOT on Holiday/Weekend/Approved Leave/Shift-cancel).
     * Idempotent: will NOT overwrite existing attendance records.
     */
    async prefillForDate(date: Date) {
        const startOfDay = moment(date)
            .tz('Asia/Dhaka')
            .startOf('day')
            .toDate();
        const endOfDay = moment(date).tz('Asia/Dhaka').endOf('day').toDate();
        const yyyymmdd = moment(startOfDay)
            .tz('Asia/Dhaka')
            .format('YYYY-MM-DD');
        const dayOfWeek = moment(date).tz('Asia/Dhaka').day(); // 0-6

        // Fetch Flags Code -> ID Map
        const flags = await this.attendanceFlagModel.find().lean().exec();
        const flagMap = new Map<string, Types.ObjectId>();
        flags.forEach(f => flagMap.set(f.code, f._id));

        // Fetch Department Configs
        const departments = await this.departmentModel.find().lean().exec();
        const deptMap = new Map<string, number[]>();
        departments.forEach(d => {
            const normalizedName = d.name.trim().toLowerCase();
            deptMap.set(normalizedName, d.weekend_days);
        });

        // Get active employees
        const employees = await this.employeeModel.find({
            status: 'active',
        });

        this.logger.log(
            `Prefilling Absent for ${employees.length} employees for date ${yyyymmdd}`,
        );

        for (const emp of employees) {
            try {
                // Skip if attendance already exists for that shift_date
                const existing = await this.attendanceModel.findOne({
                    employee: emp._id,
                    shift_date: startOfDay,
                });
                if (existing) continue; // idempotent

                // If shift is explicitly cancelled, do NOT prefill Absent here
                const override = await this.shiftOverrideModel
                    .findOne({ employee: emp._id, shift_date: startOfDay })
                    .lean()
                    .exec();
                if (override && override.override_type === 'cancel') continue;

                // Skip Holidays (range intersection)
                const holiday = await this.holidayModel.findOne({
                    dateFrom: { $lte: endOfDay },
                    dateTo: { $gte: startOfDay },
                });
                if (holiday) continue;

                // Check for Approved Leaves
                const leave = await this.leaveRequestModel.findOne({
                    employee: emp._id,
                    status: 'approved',
                    start_date: { $lte: endOfDay },
                    end_date: { $gte: startOfDay },
                });
                if (leave) continue;

                // Skip Weekends for employee's department
                const deptName = emp.department
                    ? emp.department.trim().toLowerCase()
                    : '';
                const weekendDays = deptMap.get(deptName) || [0];
                const isWeekend = weekendDays.includes(dayOfWeek);
                if (isWeekend) continue;

                // If there's no resolved shift (no template), we still prefill Absent
                // because employee is considered expected to be present by business rule.

                const flagId = flagMap.get('A');
                const systemStatus: AttendanceStatus = 'system-generated';

                // Prefill payload: we intentionally set in_time/out_time to null so the
                // record represents a provisional Absent and will be converted on check-in.
                const payload: Partial<Attendance> = {
                    shift_date: startOfDay,
                    employee: emp._id,
                    user_id: emp.e_id
                        ? `SYS_${emp.e_id}`
                        : `SYS_${emp._id.toString()}`,
                    device_id: DEFAULT_DEVICE_ID,
                    source_ip: DEFAULT_SOURCE_IP,
                    verify_mode: 'auto',
                    status: systemStatus,
                    flag: flagId,
                    late_minutes: 0,
                    out_remark: 'Prefilled Absent',
                    in_remark: 'Prefilled Absent',
                };

                await this.attendanceModel.create(payload);
            } catch (err: any) {
                this.logger.error(
                    `Failed to prefill attendance for emp ${emp._id.toString()}: ${err.message}`,
                );
            }
        }
    }

    /**
     * Generates attendance records for L, H, W, A flags if no record exists
     */
    async generateForDate(date: Date) {
        const startOfDay = moment(date)
            .tz('Asia/Dhaka')
            .startOf('day')
            .toDate();
        const endOfDay = moment(date).tz('Asia/Dhaka').endOf('day').toDate();
        const yyyymmdd = moment(startOfDay)
            .tz('Asia/Dhaka')
            .format('YYYY-MM-DD');
        const dayOfWeek = moment(date).tz('Asia/Dhaka').day(); // 0-6

        // 1. Fetch Flags Code -> ID Map
        const flags = await this.attendanceFlagModel.find().lean().exec();
        const flagMap = new Map<string, Types.ObjectId>();
        flags.forEach(f => flagMap.set(f.code, f._id));

        // 1.1 Fetch Department Configs
        const departments = await this.departmentModel.find().lean().exec();
        // Map Name -> Weekend Days
        const deptMap = new Map<string, number[]>();
        departments.forEach(d => {
            const normalizedName = d.name.trim().toLowerCase();
            deptMap.set(normalizedName, d.weekend_days);
        });

        // 2. Get all active employees
        const employees = await this.employeeModel.find({
            status: 'active',
        });

        this.logger.log(
            `Processing ${employees.length} employees for date ${yyyymmdd}`,
        );

        // Counters for reporting
        type Counts = {
            L: number;
            H: number;
            W: number;
            A: number;
            P: number;
            created: number;
            updated: number;
            skipped: number;
        };
        const counts: Counts = {
            L: 0,
            H: 0,
            W: 0,
            A: 0,
            P: 0,
            created: 0,
            updated: 0,
            skipped: 0,
        };

        for (const emp of employees) {
            try {
                // Check if attendance already exists
                const existing = await this.attendanceModel.findOne({
                    employee: emp._id,
                    shift_date: startOfDay, // Use shift_date as anchor
                });

                if (existing) {
                    // Preserve manual/device-generated attendance; only overwrite auto-generated records
                    if (existing.verify_mode !== 'auto') {
                        counts.skipped++;
                        continue;
                    }
                }

                let flagCode = ''; // Default None
                let remarks = '';

                // Priority: Holiday -> Weekend -> Leave -> Absent
                let holiday: HolidayDocument | null = null;
                let leave: LeaveRequestDocument | null = null;

                holiday = await this.holidayModel.findOne({
                    dateFrom: { $lte: endOfDay },
                    dateTo: { $gte: startOfDay },
                });

                if (holiday) {
                    flagCode = 'H';
                    remarks = holiday.name || 'Holiday';
                    counts.H++;
                } else {
                    const deptName = emp.department
                        ? emp.department.trim().toLowerCase()
                        : '';
                    const weekendDays = deptMap.get(deptName) || [0];

                    const isWeekend = weekendDays.includes(dayOfWeek);
                    if (isWeekend) {
                        flagCode = 'W';
                        remarks = 'Weekend';
                        counts.W++;
                    } else {
                        leave = await this.leaveRequestModel.findOne({
                            employee: emp._id,
                            status: 'approved',
                            start_date: { $lte: endOfDay },
                            end_date: { $gte: startOfDay },
                        });

                        if (leave) {
                            flagCode = 'L';
                            remarks = 'Auto-generated Leave';
                            counts.L++;
                        } else {
                            flagCode = 'A';
                            remarks = 'Absent (Auto-generated)';
                            counts.A++;
                        }
                    }
                }

                // If there's an explicit override to cancel the shift, handle it.
                const override = await this.shiftOverrideModel
                    .findOne({ employee: emp._id, shift_date: startOfDay })
                    .lean()
                    .exec();

                if (override && override.override_type === 'cancel') {
                    if (flagCode === 'A') {
                        // A cancelled shift counts as Present instead of Absent to avoid leave-balance confusion
                        flagCode = 'P';
                        remarks = 'Present (Due to shift cancellation)';
                        counts.A = Math.max(0, counts.A - 1);
                        counts.P++;

                        if (existing) {
                            if (existing.verify_mode === 'auto') {
                                await this.attendanceModel.findByIdAndUpdate(
                                    existing._id,
                                    {
                                        $set: {
                                            flag: flagMap.get('P'),
                                            in_remark: remarks,
                                            out_remark: remarks,
                                            late_minutes: 0,
                                        },
                                    },
                                );
                                counts.updated++;
                            } else {
                                counts.skipped++;
                            }
                            continue;
                        }
                    }
                }

                // Fetch User ID (Device ID equivalent)
                const deviceUser = await this.deviceUserModel.findOne({
                    employee: emp._id,
                });
                const userId = deviceUser
                    ? deviceUser.user_id
                    : `SYS_${emp.e_id}`;

                // Resolve flag ID from flagMap, preferring the document's stored flag for Leave/Holiday
                let flagId: Types.ObjectId | undefined;
                if (leave) {
                    flagId = leave.flag ?? flagMap.get('L');
                } else if (holiday) {
                    flagId = holiday.flag ?? flagMap.get('H');
                } else {
                    flagId = flagMap.get(flagCode);
                }

                if (!flagId) {
                    this.logger.warn(
                        `No attendance flag resolved for code='${flagCode}' employee='${emp._id.toString()}' date=${yyyymmdd}`,
                    );
                }

                const systemStatus: AttendanceStatus = 'system-generated';

                // Determine dummy times for system-generated records
                const resolvedShift =
                    await this.attendanceService.resolveShiftForDate(
                        emp._id,
                        startOfDay,
                    );
                const shiftStart = resolvedShift?.shift_start || '09:00';
                const shiftEnd = resolvedShift?.shift_end || '17:00';
                const crossesMidnight =
                    resolvedShift?.crosses_midnight || false;

                const inTime = moment
                    .tz(
                        `${yyyymmdd} ${shiftStart}`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
                let outTimeMoment = moment.tz(
                    `${yyyymmdd} ${shiftEnd}`,
                    'YYYY-MM-DD HH:mm',
                    'Asia/Dhaka',
                );
                if (crossesMidnight) {
                    outTimeMoment = outTimeMoment.add(1, 'day');
                }
                const outTime = outTimeMoment.toDate();

                const payload: Partial<Attendance> = {
                    shift_date: startOfDay,
                    employee: emp._id,
                    user_id: userId,
                    device_id: DEFAULT_DEVICE_ID,
                    source_ip: DEFAULT_SOURCE_IP,
                    verify_mode: 'auto', // Mark as auto-generated
                    status: systemStatus,
                    flag: flagId,
                    in_time: inTime,
                    out_time: outTime,
                    late_minutes: 0,
                    ot_minutes: 0,
                    out_remark: remarks,
                    in_remark: remarks,
                };

                if (existing) {
                    await this.attendanceModel.findByIdAndUpdate(existing._id, {
                        $set: payload,
                    });
                    counts.updated++;
                } else {
                    await this.attendanceModel.create(payload);
                    counts.created++;
                }
            } catch (err: any) {
                this.logger.error(
                    `Failed to generate attendance for emp ${emp._id.toString()}: ${err.message}`,
                );
            }
        }

        // Final summary log
        this.logger.log(
            `Daily generation summary for ${yyyymmdd}: created=${counts.created}, updated=${counts.updated}, skipped=${counts.skipped}, L=${counts.L}, H=${counts.H}, W=${counts.W}, A=${counts.A}, P=${counts.P}`,
        );
    }
}
