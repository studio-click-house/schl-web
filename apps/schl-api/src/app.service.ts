// app.service.ts
import { Get, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService implements OnModuleInit {
    private readonly logger = new Logger(AppService.name);

    constructor(@InjectConnection() private readonly connection: Connection) {}

    onModuleInit() {
        this.connection.once('open', () => {
            this.logger.log('Connected to MongoDB!');
        });

        this.connection.on('error', err => {
            this.logger.error('MongoDB connection error:', err);
        });
    }

    @Get()
    getHello(): string {
        return 'Hello World!';
    }
}
