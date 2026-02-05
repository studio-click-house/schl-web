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
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { Model } from 'mongoose';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceFactory } from './factories/attendance.factory';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);
    constructor(
        @InjectModel(Attendance.name)
        private attendanceModel: Model<Attendance>,
        @InjectModel(DeviceUser.name)
        private deviceUserModel: Model<DeviceUser>,
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
            const payload = AttendanceFactory.fromMarkDto(body, currentTime);
            (payload as any).employee = deviceUserMapping.employee;
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
            'admin:create_attendance',
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
        employeeId: string,
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
            const query = { employee: employeeId };

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
