import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
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
import { Leave, LeaveDocument } from '@repo/common/models/leave.schema';
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
        const yyyymmdd = moment(date).tz('Asia/Dhaka').format('YYYY-MM-DD');
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

        for (const emp of employees) {
            try {
                // Check if attendance already exists
                const existing = await this.attendanceModel.findOne({
                    employee: emp._id,
                    shift_date: startOfDay, // Use shift_date as anchor
                });

                if (existing) {
                    continue; // Already has attendance (manual or device punch)
                }

                // Resolve Shift for times
                const shift = await this.attendanceService.resolveShiftForDate(
                    emp._id,
                    startOfDay,
                );

                let flagCode = ''; // Default None
                let remarks = '';

                // A. Check Leaves
                const leave = await this.leaveModel.findOne({
                    employee: emp._id,
                    status: 'approved',
                    start_date: { $lte: yyyymmdd },
                    end_date: { $gte: yyyymmdd },
                });

                if (leave) {
                    flagCode = 'L';
                    remarks = 'Auto-generated Leave';
                } else {
                    // B. Check Holidays
                    const holiday = await this.holidayModel.findOne({
                        start_date: { $lte: yyyymmdd },
                        end_date: { $gte: yyyymmdd },
                    });

                    if (holiday) {
                        flagCode = 'H';
                        remarks = holiday.name || 'Holiday';
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
                        } else {
                            // D. Absent (If nothing else)
                            // "A is assigned auto when a employee didn't come office... unless H, W, L"
                            flagCode = 'A';
                            remarks = 'Absent (Auto-generated)';
                        }
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

                // Create Attendance Record
                const flagId = flagMap.get(flagCode);

                await this.attendanceModel.create({
                    in_time: inTimeDate,
                    out_time: outTimeDate,
                    shift_date: startOfDay,
                    employee: emp._id,
                    user_id: userId,
                    device_id: DEFAULT_DEVICE_ID,
                    source_ip: DEFAULT_SOURCE_IP,
                    verify_mode: 'manual', // or 'auto'? Schema enum: 'manual' exists in constants
                    status: 'check-in',
                    flag: flagId,
                    out_remark: remarks,
                    in_remark: remarks,
                });
            } catch (err: any) {
                this.logger.error(
                    `Failed to generate attendance for emp ${emp._id.toString()}: ${err.message}`,
                );
            }
        }
    }
}
