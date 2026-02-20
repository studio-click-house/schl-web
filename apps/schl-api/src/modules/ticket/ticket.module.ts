import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    CommitLog,
    CommitLogSchema,
} from '@repo/common/models/commit-log.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Ticket, TicketSchema } from '@repo/common/models/ticket.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Ticket.name, schema: TicketSchema },
            { name: CommitLog.name, schema: CommitLogSchema },
            { name: User.name, schema: UserSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [TicketController],
    providers: [TicketService],
})
export class TicketModule {}
