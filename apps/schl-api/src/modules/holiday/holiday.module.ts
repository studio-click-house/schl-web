import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Holiday, HolidaySchema } from '@repo/common/models/holiday.schema';
import {
    ShiftSchedule,
    ShiftScheduleSchema,
} from '@repo/common/models/shift-schedule.schema';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Holiday.name, schema: HolidaySchema },
            {
                name: ShiftSchedule.name,
                schema: ShiftScheduleSchema,
            },
        ]),
    ],
    controllers: [HolidayController],
    providers: [HolidayService],
    exports: [HolidayService],
})
export class HolidayModule {}
