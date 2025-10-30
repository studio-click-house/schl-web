import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schedule, ScheduleSchema } from '@repo/common/models/schedule.schema';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Schedule.name, schema: ScheduleSchema },
        ]),
    ],
    controllers: [ScheduleController],
    providers: [ScheduleService],
})
export class ScheduleModule {}
