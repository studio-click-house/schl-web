import { Module } from '@nestjs/common';

import { ClientController } from './client.controller';

import { ClientService } from './client.service';

import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from 'src/models/client.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Client.name, schema: ClientSchema },
        ]),
    ],
    controllers: [ClientController],
    providers: [ClientService],
})
export class ClientModule {}
