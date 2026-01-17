import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppUser, AppUserSchema } from '@repo/common/models/app-user.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import { WorkLog, WorkLogSchema } from '@repo/common/models/work-log.schema';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AppUser.name, schema: AppUserSchema },
            { name: WorkLog.name, schema: WorkLogSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [TrackerController],
    providers: [TrackerService],
})
export class TrackerModule {}
