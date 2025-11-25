import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
    QnapSession,
    QnapSessionSchema,
} from '@repo/common/models/qnap-session.schema';
import { QnapController } from './qnap.controller';
import { QnapService } from './qnap.service';
import { AtlasSessionStore } from './session/atlas-session-store';

@Global()
@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: QnapSession.name, schema: QnapSessionSchema },
        ]),
    ],
    controllers: [QnapController],
    providers: [
        {
            provide: 'QNAP_SESSION_STORE',
            useClass: AtlasSessionStore,
        },
        QnapService,
    ],
    exports: [QnapService],
})
export class QnapModule {}
