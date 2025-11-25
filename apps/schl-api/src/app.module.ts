import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { JwtStrategy } from './common/auth/jwt.strategy';
import { ApprovalModule } from './modules/approval/approval.module';
import { ClientModule } from './modules/client/client.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { FtpModule } from './modules/ftp/ftp.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { NoticeModule } from './modules/notice/notice.module';
import { OrderModule } from './modules/order/order.module';
import { QnapModule } from './modules/qnap/qnap.module';
import { ReportModule } from './modules/report/report.module';
import { RoleModule } from './modules/role/role.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { UserModule } from './modules/user/user.module';
import { ValidatorModule } from './modules/validator/validator.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.VERCEL_ENV
                ? undefined
                : `config/.env.${process.env.NODE_ENV}`,
            ignoreEnvFile: !!process.env.VERCEL_ENV,
        }), // loads .env into process.env
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                uri: config.get<string>('MONGODB_URI'),
                dbName: config.get<string>('DB_NAME'),
                maxPoolSize: 10,
            }),
        }),
        QnapModule,
        UserModule,
        RoleModule,
        ClientModule,
        ScheduleModule,
        EmployeeModule,
        ReportModule,
        FtpModule,
        InvoiceModule,
        NoticeModule,
        ApprovalModule,
        OrderModule,
        ValidatorModule,
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
