import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '@repo/common/models/client.schema';
import { Invoice, InvoiceSchema } from '@repo/common/models/invoice.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';

import { QnapModule } from '../qnap/qnap.module';
import { OrderController } from './order.controller';

import { OrderService } from './order.service';

@Module({
    imports: [
        QnapModule,
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Client.name, schema: ClientSchema },
            { name: Invoice.name, schema: InvoiceSchema },
        ]),
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule {}
