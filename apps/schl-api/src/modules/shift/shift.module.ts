import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ShiftSchedule,
    ShiftScheduleSchema,
} from '@repo/common/models/shift-schedule.schema';
import { Shift, ShiftSchema } from '@repo/common/models/shift.schema';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Shift.name, schema: ShiftSchema },
            {
                name: ShiftSchedule.name,
                schema: ShiftScheduleSchema,
            },
        ]),
    ],
    controllers: [ShiftController],
    providers: [ShiftService],
    exports: [ShiftService],
})
export class ShiftModule {}
