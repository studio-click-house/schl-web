import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DeviceUser,
    DeviceUserSchema,
} from '@repo/common/models/device-user.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { DeviceUserController } from './device-user.controller';
import { DeviceUserService } from './device-user.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DeviceUser.name, schema: DeviceUserSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [DeviceUserController],
    providers: [DeviceUserService],
})
export class DeviceUserModule {}
