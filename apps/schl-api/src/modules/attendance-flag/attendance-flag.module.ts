import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    AttendanceFlag,
    AttendanceFlagSchema,
} from '@repo/common/models/attendance-flag.schema';
import { AttendanceFlagController } from './attendance-flag.controller';
import { AttendanceFlagService } from './attendance-flag.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AttendanceFlag.name, schema: AttendanceFlagSchema },
        ]),
    ],
    controllers: [AttendanceFlagController],
    providers: [AttendanceFlagService],
    exports: [AttendanceFlagService, MongooseModule],
})
export class AttendanceFlagModule {}
