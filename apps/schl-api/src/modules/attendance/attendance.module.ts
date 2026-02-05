import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Attendance,
    AttendanceSchema,
} from '@repo/common/models/attendance.schema';
import {
    DepartmentConfig,
    DepartmentConfigSchema,
} from '@repo/common/models/department-config.schema';
import {
    DeviceUser,
    DeviceUserSchema,
} from '@repo/common/models/device-user.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Holiday, HolidaySchema } from '@repo/common/models/holiday.schema';
import {
    ShiftSchedule,
    ShiftScheduleSchema,
} from '@repo/common/models/shift-schedule.schema';
import { Shift, ShiftSchema } from '@repo/common/models/shift.schema';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attendance.name, schema: AttendanceSchema },
            { name: DepartmentConfig.name, schema: DepartmentConfigSchema },
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: Shift.name, schema: ShiftSchema },
            {
                name: ShiftSchedule.name,
                schema: ShiftScheduleSchema,
            },
            { name: Holiday.name, schema: HolidaySchema },
        ]),
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule {}
