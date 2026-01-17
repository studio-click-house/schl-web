import { Module } from '@nestjs/common';

import { ClientController } from './client.controller';

import { ClientService } from './client.service';

import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '@repo/common/models/client.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Client.name, schema: ClientSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [ClientController],
    providers: [ClientService],
})
export class ClientModule {}
