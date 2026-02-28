import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppUser, AppUserSchema } from '@repo/common/models/app-user.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import {
    QcWorkLog,
    QcWorkLogSchema,
} from '@repo/common/models/qc-work-log.schema';
import {
    UserSession,
    UserSessionSchema,
} from '@repo/common/models/user-session.schema';
import { TrackerController } from './tracker.controller';
import { TrackerAuthService } from './tracker.auth.service';
import { TrackerQcWorkLogService } from './tracker.qc-work-log.service';
import { TrackerQueryService } from './tracker.query.service';
import { TrackerGateway } from './tracker.gateway';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AppUser.name, schema: AppUserSchema },
            { name: QcWorkLog.name, schema: QcWorkLogSchema },
            { name: Order.name, schema: OrderSchema },
            { name: UserSession.name, schema: UserSessionSchema },
        ]),
    ],
    controllers: [TrackerController],
    providers: [
        TrackerAuthService,
        TrackerQcWorkLogService,
        TrackerQueryService,
    ],
})
export class TrackerModule {}
