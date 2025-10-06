import { Module } from '@nestjs/common';

import { ClientController } from './client.controller';

import { ClientService } from './client.service';

import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from 'src/models/client.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Client.name, schema: ClientSchema },
        ]),
    ],
    controllers: [ClientController],
    providers: [
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
            }),
        },

        ClientService,
    ],
})
export class ClientModule {}
