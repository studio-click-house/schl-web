import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Approval, ApprovalSchema } from '@repo/common/models/approval.schema';
import { Client, ClientSchema } from '@repo/common/models/client.schema';
import { Order, OrderSchema } from '@repo/common/models/order.schema';
import { Report, ReportSchema } from '@repo/common/models/report.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Report.name, schema: ReportSchema },
            { name: Client.name, schema: ClientSchema },
            { name: Approval.name, schema: ApprovalSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [ReportController],
    providers: [ReportService],
})
export class ReportModule {}
