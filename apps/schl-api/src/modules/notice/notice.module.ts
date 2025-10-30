import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notice, NoticeSchema } from '@repo/common/models/notice.schema';

import { NoticeController } from './notice.controller';

import { NoticeService } from './notice.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notice.name, schema: NoticeSchema },
        ]),
    ],
    controllers: [NoticeController],
    providers: [NoticeService],
})
export class NoticeModule {}
