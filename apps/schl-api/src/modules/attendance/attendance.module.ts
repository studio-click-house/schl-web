import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Attendance,
    AttendanceSchema,
} from '@repo/common/models/attendance.schema';
import {
    DeviceUser,
    DeviceUserSchema,
} from '@repo/common/models/device-user.schema';
import {
    ShiftPlan,
    ShiftPlanSchema,
} from '@repo/common/models/shift-plan.schema';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema },
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: ShiftPlan.name, schema: ShiftPlanSchema },
        ]),
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
})
export class AttendanceModule {}
