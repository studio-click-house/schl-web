import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DeviceUser,
    DeviceUserSchema,
} from '@repo/common/models/device-user.schema';
import { DeviceUserController } from './device-user.controller';
import { DeviceUserService } from './device-user.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DeviceUser.name, schema: DeviceUserSchema },
        ]),
    ],
    controllers: [DeviceUserController],
    providers: [DeviceUserService],
})
export class DeviceUserModule {}
