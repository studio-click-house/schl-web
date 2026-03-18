import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Attendance,
    AttendanceSchema,
} from '@repo/common/models/attendance.schema';
import {
    Department,
    DepartmentSchema,
} from '@repo/common/models/department.schema';
import {
    DeviceUser,
    DeviceUserSchema,
} from '@repo/common/models/device-user.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Holiday, HolidaySchema } from '@repo/common/models/holiday.schema';
import {
    LeaveRequest,
    LeaveRequestSchema,
} from '@repo/common/models/leave-request.schema';
import {
    ShiftPlan,
    ShiftPlanSchema,
} from '@repo/common/models/shift-plan.schema';
import { AttendanceFlagModule } from '../attendance-flag/attendance-flag.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: Attendance.name, schema: AttendanceSchema },
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: ShiftPlan.name, schema: ShiftPlanSchema },
        ]),
        AttendanceModule, // import AttendanceModule to get AttendanceService
        AttendanceFlagModule, // import AttendanceFlagModule to get AttendanceFlag model
    ],
    controllers: [LeaveRequestController],
    providers: [LeaveRequestService],
    exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
