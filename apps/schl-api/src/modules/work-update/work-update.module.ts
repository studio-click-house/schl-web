import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Ticket, TicketSchema } from '@repo/common/models/ticket.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import {
    WorkUpdate,
    WorkUpdateSchema,
} from '@repo/common/models/work-update.schema';
import { WorkUpdateController } from './work-update.controller';
import { WorkUpdateService } from './work-update.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WorkUpdate.name, schema: WorkUpdateSchema },
            { name: Ticket.name, schema: TicketSchema },
            { name: User.name, schema: UserSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [WorkUpdateController],
    providers: [WorkUpdateService],
})
export class WorkUpdateModule {}
