import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    TrackerUser,
    TrackerUserSchema,
} from '@repo/common/models/tracker-user.schema';
import { WorkLog, WorkLogSchema } from '@repo/common/models/work-log.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TrackerUser.name, schema: TrackerUserSchema },
            { name: WorkLog.name, schema: WorkLogSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [TrackerController],
    providers: [TrackerService],
})
export class TrackerModule { }
