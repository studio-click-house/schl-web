import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Approval, ApprovalSchema } from 'src/models/approval.schema';
import { Client, ClientSchema } from 'src/models/client.schema';
import { Employee, EmployeeSchema } from 'src/models/employee.schema';
import { Order, OrderSchema } from 'src/models/order.schema';
import { Report, ReportSchema } from 'src/models/report.schema';
import { Role, RoleSchema } from 'src/models/role.schema';
import { Schedule, ScheduleSchema } from 'src/models/schedule.schema';
import { User, UserSchema } from 'src/models/user.schema';

import { ApprovalController } from './approval.controller';

import { ApprovalService } from './approval.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Approval.name, schema: ApprovalSchema },
            { name: User.name, schema: UserSchema },
            { name: Client.name, schema: ClientSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Report.name, schema: ReportSchema },
            { name: Schedule.name, schema: ScheduleSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],

    controllers: [ApprovalController],

    providers: [ApprovalService],
})
export class ApprovalModule {}
