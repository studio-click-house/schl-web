import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Attendance } from '@repo/common/models/attendance.schema';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { Model } from 'mongoose';
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
    ) {}

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

        const payload = AttendanceFactory.fromMarkDto(body);
        (payload as any).employee = deviceUserMapping.employee;

        try {
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
}
