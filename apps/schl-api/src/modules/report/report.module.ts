import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Approval, ApprovalSchema } from 'src/models/approval.schema';
import { Client, ClientSchema } from 'src/models/client.schema';
import { Report, ReportSchema } from 'src/models/report.schema';
import { User, UserSchema } from 'src/models/user.schema';
import { ReportController } from './report.controller';
import { ReportService } from './services/report.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Report.name, schema: ReportSchema },
            { name: Client.name, schema: ClientSchema },
            { name: Approval.name, schema: ApprovalSchema },
        ]),
    ],
    controllers: [ReportController],
    providers: [ReportService],
})
export class ReportModule {}
