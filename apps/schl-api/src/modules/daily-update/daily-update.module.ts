import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DailyUpdate,
    DailyUpdateSchema,
} from '@repo/common/models/daily-update.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Ticket, TicketSchema } from '@repo/common/models/ticket.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { DailyUpdateController } from './daily-update.controller';
import { DailyUpdateService } from './daily-update.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DailyUpdate.name, schema: DailyUpdateSchema },
            { name: Ticket.name, schema: TicketSchema },
            { name: User.name, schema: UserSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [DailyUpdateController],
    providers: [DailyUpdateService],
})
export class DailyUpdateModule {}
