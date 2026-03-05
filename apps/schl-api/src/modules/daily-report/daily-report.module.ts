import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DailyReport,
    DailyReportSchema,
} from '@repo/common/models/daily-report.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Ticket, TicketSchema } from '@repo/common/models/ticket.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { DailyReportController } from './daily-report.controller';
import { DailyReportService } from './daily-report.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DailyReport.name, schema: DailyReportSchema },
            { name: Ticket.name, schema: TicketSchema },
            { name: User.name, schema: UserSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [DailyReportController],
    providers: [DailyReportService],
})
export class DailyReportModule {}
