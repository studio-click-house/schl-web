import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '@repo/common/models/client.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { QnapModule } from '../qnap/qnap.module';
import { JobController } from './job.controller';
import { JobService } from './job.service';

@Module({
    imports: [
        QnapModule,
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Client.name, schema: ClientSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [JobController],
    providers: [JobService],
    exports: [JobService],
})
export class JobModule {}
