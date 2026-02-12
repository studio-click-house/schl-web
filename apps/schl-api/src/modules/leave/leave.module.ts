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
import { Leave, LeaveSchema } from '@repo/common/models/leave.schema';
import {
    ShiftTemplate,
    ShiftTemplateSchema,
} from '@repo/common/models/shift-template.schema';
import { AttendanceFlagModule } from '../attendance-flag/attendance-flag.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Leave.name, schema: LeaveSchema },
            { name: Attendance.name, schema: AttendanceSchema },
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: ShiftTemplate.name, schema: ShiftTemplateSchema },
        ]),
        AttendanceModule, // import AttendanceModule to get AttendanceService
        AttendanceFlagModule, // import AttendanceFlagModule to get AttendanceFlag model
    ],
    controllers: [LeaveController],
    providers: [LeaveService],
    exports: [LeaveService],
})
export class LeaveModule {}
