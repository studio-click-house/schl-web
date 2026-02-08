import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { JwtStrategy } from './common/auth/jwt.strategy';
import { ApprovalModule } from './modules/approval/approval.module';
import { AttendanceFlagModule } from './modules/attendance-flag/attendance-flag.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ClientModule } from './modules/client/client.module';
import { DepartmentModule } from './modules/department/department.module';
import { DeviceUserModule } from './modules/device-user/device-user.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { FtpModule } from './modules/ftp/ftp.module';
import { HolidayModule } from './modules/holiday/holiday.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { LeaveModule } from './modules/leave/leave.module';
import { NoticeModule } from './modules/notice/notice.module';
import { OrderModule } from './modules/order/order.module';
import { ReportModule } from './modules/report/report.module';
import { RoleModule } from './modules/role/role.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { ShiftPlanModule } from './modules/shift-plan/shift-plan.module';
import { TrackerModule } from './modules/tracker/tracker.module';
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
        NestScheduleModule.forRoot(),
        UserModule,
        RoleModule,
        ClientModule,
        DepartmentModule,
        ScheduleModule,
        EmployeeModule,
        ReportModule,
        FtpModule,
        InvoiceModule,
        NoticeModule,
        ApprovalModule,
        OrderModule,
        ValidatorModule,
        TrackerModule,
        AttendanceModule,
        AttendanceFlagModule,
        HolidayModule,
        LeaveModule,
        ShiftPlanModule,
        DeviceUserModule,
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
