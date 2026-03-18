import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    AttendanceFlag,
    AttendanceFlagSchema,
} from '@repo/common/models/attendance-flag.schema';
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
    ShiftOverride,
    ShiftOverrideSchema,
} from '@repo/common/models/shift-override.schema';
import {
    ShiftResolved,
    ShiftResolvedSchema,
} from '@repo/common/models/shift-resolved.schema';
import {
    ShiftPlan,
    ShiftPlanSchema,
} from '@repo/common/models/shift-plan.schema';
import { AttendanceGeneratorService } from './attendance-generator.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema },
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: ShiftPlan.name, schema: ShiftPlanSchema },
            { name: ShiftOverride.name, schema: ShiftOverrideSchema },
            { name: ShiftResolved.name, schema: ShiftResolvedSchema },
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: AttendanceFlag.name, schema: AttendanceFlagSchema },
        ]),
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService, AttendanceGeneratorService],
    exports: [AttendanceService],
})
export class AttendanceModule {}
