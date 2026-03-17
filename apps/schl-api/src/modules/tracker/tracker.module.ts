import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppUser, AppUserSchema } from '@repo/common/models/app-user.schema';
import { Employee, EmployeeSchema } from '@repo/common/models/employee.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import {
    PauseSession,
    PauseSessionSchema,
} from '@repo/common/models/pause-session.schema';
import { WorkLog, WorkLogSchema } from '@repo/common/models/work-log.schema';
import {
    UserSession,
    UserSessionSchema,
} from '@repo/common/models/user-session.schema';
import { TrackerController } from './tracker.controller';
import { TrackerGateway } from './gateways/tracker.gateway';
import { TrackerAuthService } from './services/auth.service';
import { TrackerPauseService } from './services/pause.service';
import { TrackerWorkLogService } from './services/work-log.service';
import { TrackerQueryService } from './services/query.service';
import { TrackerReportService } from './services/report.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AppUser.name, schema: AppUserSchema },
            { name: Employee.name, schema: EmployeeSchema },
            { name: PauseSession.name, schema: PauseSessionSchema },
            { name: WorkLog.name, schema: WorkLogSchema },
            { name: Order.name, schema: OrderSchema },
            { name: UserSession.name, schema: UserSessionSchema },
        ]),
    ],
    controllers: [TrackerController],
    providers: [
        TrackerAuthService,
        TrackerPauseService,
        TrackerWorkLogService,
        TrackerReportService,
        TrackerQueryService,
        TrackerGateway,
    ],
})
export class TrackerModule {}
