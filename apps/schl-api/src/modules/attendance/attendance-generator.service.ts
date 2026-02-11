import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import type { AttendanceStatus } from '@repo/common/constants/attendance.constant';
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
        @InjectModel(Leave.name)
        private leaveModel: Model<LeaveDocument>,
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
            status: { $in: ['active', 'on-leave'] },
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
            created: number;
            updated: number;
            skipped: number;
        };
        const counts: Counts = {
            L: 0,
            H: 0,
            W: 0,
            A: 0,
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
                    // If an attendance exists and it was NOT auto-generated, preserve it.
                    // If it was auto-generated previously (verify_mode === 'auto'), we'll update it.
                    if ((existing as any).verify_mode !== 'auto') {
                        counts.skipped++;
                        continue; // Preserve manual/device-generated attendance
                    }
                }

                // Resolve Shift for times
                const shift = await this.attendanceService.resolveShiftForDate(
                    emp._id,
                    startOfDay,
                );

                let flagCode = ''; // Default None
                let remarks = '';

                // A. Check Leaves
                let holiday: HolidayDocument | null = null;
                const leave = await this.leaveModel.findOne({
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
                    // B. Check Holidays (range intersection)
                    holiday = await this.holidayModel.findOne({
                        dateFrom: { $lte: endOfDay },
                        dateTo: { $gte: startOfDay },
                    });

                    if (holiday) {
                        flagCode = 'H';
                        remarks = holiday.name || 'Holiday';
                        counts.H++;
                    } else {
                        // C. Check Weekend
                        const deptName = emp.department
                            ? emp.department.trim().toLowerCase()
                            : '';
                        const weekendDays = deptMap.get(deptName) || [0]; // Default Sunday (0) if not configured

                        const isWeekend = weekendDays.includes(dayOfWeek);

                        if (isWeekend) {
                            flagCode = 'W';
                            remarks = 'Weekend';
                            counts.W++;
                        } else {
                            // D. Absent (If nothing else)
                            // "A is assigned auto when a employee didn't come office... unless H, W, L"
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
                        // A cancelled shift without Leave/Holiday/Weekend means treat it as a paid leave.
                        // Ensure there is an approved Leave record for that day; create one if missing.
                        let effectiveLeave = await this.leaveModel.findOne({
                            employee: emp._id,
                            status: 'approved',
                            start_date: { $lte: endOfDay },
                            end_date: { $gte: startOfDay },
                        });

                        const defaultLeaveFlag = flagMap.get('L');

                        if (!effectiveLeave) {
                            try {
                                effectiveLeave = await this.leaveModel.create({
                                    employee: emp._id,
                                    flag: defaultLeaveFlag,
                                    start_date: startOfDay,
                                    end_date: startOfDay,
                                    reason: 'Auto-approved paid leave due to shift cancellation',
                                    status: 'approved',
                                } as any);
                                this.logger.log(
                                    `Auto-created approved leave for emp=${emp._id.toString()} date=${yyyymmdd} due to cancel override`,
                                );
                            } catch (err: any) {
                                this.logger.error(
                                    `Failed to auto-create leave for emp=${emp._id.toString()} date=${yyyymmdd}: ${err.message}`,
                                );
                            }
                        }

                        // Convert this day to Leave
                        counts.A = Math.max(0, counts.A - 1);
                        counts.L++;
                        flagCode = 'L';
                        remarks =
                            'Paid Leave (Auto-created due to shift cancellation)';

                        // If an auto-generated attendance already exists, update it to reflect the leave
                        if (existing) {
                            if ((existing as any).verify_mode === 'auto') {
                                const newFlagId =
                                    (effectiveLeave as any)?.flag ||
                                    defaultLeaveFlag;
                                await this.attendanceModel.findByIdAndUpdate(
                                    existing._id,
                                    {
                                        $set: {
                                            flag: newFlagId,
                                            in_remark: remarks,
                                            out_remark: remarks,
                                            late_minutes: 0,
                                            verify_mode: 'auto',
                                            status:
                                                ATTENDANCE_STATUSES.find(
                                                    s =>
                                                        (s as string) ===
                                                        'system-generated',
                                                ) ?? ATTENDANCE_STATUSES[0],
                                        },
                                    },
                                );
                                counts.updated++;
                                continue; // Updated existing record; no need to create
                            } else {
                                // Preserve manual/device-generated attendance
                                counts.skipped++;
                                continue;
                            }
                        }

                        // If no existing attendance, fall through to create a system-generated Leave attendance below
                    } else {
                        // If it's already L/H/W, preserve existing behavior (no special action)
                    }
                }

                // Determine Times
                let inTimeStr = '09:00';
                let outTimeStr = '17:00';

                if (shift) {
                    inTimeStr = shift.shift_start;
                    outTimeStr = shift.shift_end;
                }

                const inTimeDate = moment
                    .tz(
                        `${yyyymmdd} ${inTimeStr}`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();
                let outTimeDate = moment
                    .tz(
                        `${yyyymmdd} ${outTimeStr}`,
                        'YYYY-MM-DD HH:mm',
                        'Asia/Dhaka',
                    )
                    .toDate();

                if (outTimeDate < inTimeDate) {
                    outTimeDate = moment(outTimeDate).add(1, 'day').toDate();
                }

                // Fetch User ID (Device ID equivalent)
                const deviceUser = await this.deviceUserModel.findOne({
                    employee: emp._id,
                });
                const userId = deviceUser
                    ? deviceUser.user_id
                    : `SYS_${emp.e_id}`;

                // Create or Update Attendance Record
                let flagId = undefined as Types.ObjectId | undefined;
                if (leave) {
                    flagId = (leave as any).flag || flagMap.get('L');
                } else if (typeof holiday !== 'undefined' && holiday) {
                    flagId = (holiday as any).flag || flagMap.get('H');
                } else if (flagCode === 'W') {
                    flagId = flagMap.get('W');
                } else if (flagCode === 'A') {
                    flagId = flagMap.get('A');
                } else if (flagCode === 'L') {
                    flagId = flagMap.get('L');
                } else if (flagCode === 'H') {
                    flagId = flagMap.get('H');
                }

                if (!flagId) {
                    this.logger.warn(
                        `No attendance flag resolved for code='${flagCode}' employee='${emp._id.toString()}' date=${yyyymmdd}`,
                    );
                }

                const systemStatus =
                    ATTENDANCE_STATUSES.find(
                        s => (s as string) === 'system-generated',
                    ) ?? ATTENDANCE_STATUSES[0];

                const payload: Partial<Attendance> = {
                    in_time: inTimeDate,
                    out_time: outTimeDate,
                    shift_date: startOfDay,
                    employee: emp._id,
                    user_id: userId,
                    device_id: DEFAULT_DEVICE_ID,
                    source_ip: DEFAULT_SOURCE_IP,
                    verify_mode: 'auto', // Mark as auto-generated
                    status: systemStatus,
                    flag: flagId,
                    late_minutes: 0,
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
            `Daily generation summary for ${yyyymmdd}: created=${counts.created}, updated=${counts.updated}, skipped=${counts.skipped}, L=${counts.L}, H=${counts.H}, W=${counts.W}, A=${counts.A}`,
        );
    }
}
