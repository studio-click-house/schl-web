// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { JwtStrategy } from './common/auth/jwt.strategy';
import { ClientModule } from './modules/client/client.module';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ReportModule } from './modules/report/report.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }), // loads .env into process.env
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                uri: config.get<string>('MONGODB_URI'),
                dbName: config.get<string>('DB_NAME'),
                maxPoolSize: 10,
            }),
        }),
        UserModule,
        RoleModule,
        ClientModule,
        ScheduleModule,
        EmployeeModule,
        ReportModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        JwtStrategy,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {}
