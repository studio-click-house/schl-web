import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DailyUpdate,
    DailyUpdateSchema,
} from '@repo/common/models/daily-update.schema';
import { Ticket, TicketSchema } from '@repo/common/models/ticket.schema';
import { DailyUpdateController } from './daily-update.controller';
import { DailyUpdateService } from './daily-update.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DailyUpdate.name, schema: DailyUpdateSchema },
            { name: Ticket.name, schema: TicketSchema },
        ]),
    ],
    controllers: [DailyUpdateController],
    providers: [DailyUpdateService],
})
export class DailyUpdateModule {}
