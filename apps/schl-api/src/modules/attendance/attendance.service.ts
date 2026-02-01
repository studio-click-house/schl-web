import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Attendance } from '@repo/common/models/attendance.schema';
import { Model } from 'mongoose';
import { MarkEmployeeDto } from './dto/mark-employee.dto';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);
    constructor(
        @InjectModel(Attendance.name)
        private attendanceModel: Model<Attendance>,
    ) {}

    async markAttendance(body: MarkEmployeeDto) {}
}
