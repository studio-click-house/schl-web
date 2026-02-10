import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Holiday, HolidaySchema } from '@repo/common/models/holiday.schema';
import { AttendanceFlagModule } from '../attendance-flag/attendance-flag.module';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Holiday.name, schema: HolidaySchema },
        ]),
        AttendanceFlagModule,
    ],
    controllers: [HolidayController],
    providers: [HolidayService],
    exports: [HolidayService],
})
export class HolidayModule {}
