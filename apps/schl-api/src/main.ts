import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dns from 'node:dns';
import { AppModule } from './app.module';

// Global fix for Node + Windows SRV resolution
dns.setDefaultResultOrder('ipv4first');

// Development-only DNS override to prevent intermittent timeouts
if (process.env.NODE_ENV === 'development') {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.enableCors({
        origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow: boolean) => void,
        ) => {
            const allowedOrigins: (string | RegExp)[] = [
                process.env.PORTAL_URL,
                process.env.CRM_URL,
                /https:\/\/.*\.studioclickhouse\.com$/, // Adjust regex as needed
            ].filter((item): item is string | RegExp => Boolean(item));

            if (!origin) return callback(null, true);

            const isAllowed = allowedOrigins.some(allowed =>
                typeof allowed === 'string'
                    ? allowed === origin
                    : allowed.test(origin),
            );

            if (isAllowed) callback(null, true);
            else
                callback(
                    new Error(`CORS policy: Origin ${origin} not allowed`),
                    false,
                );
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    });

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(() => {
    process.exit(1);
});
