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
import { Attendance } from '@repo/common/models/attendance.schema';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import { determineShiftDate } from '@repo/common/utils/ot-calculation';
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
        @InjectModel(ShiftPlan.name)
        private shiftPlanModel: Model<ShiftPlan>,
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

        // Fetch shift plan for the employee to determine shift_date
        // Look at today and yesterday's shift plans to handle midnight crossings
        const estimatedShiftDate = moment
            .tz(currentTime, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const shiftPlan = await this.shiftPlanModel
            .findOne({
                employee: deviceUserMapping.employee,
                shift_date: {
                    $gte: moment
                        .tz(estimatedShiftDate, 'Asia/Dhaka')
                        .subtract(1, 'day')
                        .toDate(),
                    $lte: estimatedShiftDate,
                },
            })
            .sort({ shift_date: -1 })
            .exec();

        // Determine which business day (shift_date) this attendance belongs to
        const shiftDate = determineShiftDate(
            currentTime,
            shiftPlan
                ? {
                      shift_start: shiftPlan.shift_start,
                      crosses_midnight: shiftPlan.crosses_midnight,
                  }
                : undefined,
        );

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
        const estimatedShiftDate = moment
            .tz(inTime, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const shiftPlan = await this.shiftPlanModel
            .findOne({
                employee: attendanceData.employeeId,
                shift_date: {
                    $gte: moment
                        .tz(estimatedShiftDate, 'Asia/Dhaka')
                        .subtract(1, 'day')
                        .toDate(),
                    $lte: estimatedShiftDate,
                },
            })
            .sort({ shift_date: -1 })
            .exec();

        const shiftDate = determineShiftDate(
            inTime,
            shiftPlan
                ? {
                      shift_start: shiftPlan.shift_start,
                      crosses_midnight: shiftPlan.crosses_midnight,
                  }
                : undefined,
        );
        (payload as any).shift_date = shiftDate;

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
                    .sort({ in_time: -1 })
                    .exec();
                return records;
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const limit = pagination.itemsPerPage;

            const [items, count] = await Promise.all([
                this.attendanceModel
                    .find(query)
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
