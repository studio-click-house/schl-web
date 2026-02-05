import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    DepartmentConfig,
    DepartmentConfigSchema,
} from '@repo/common/models/department-config.schema';
import { DepartmentConfigController } from './department-config.controller';
import { DepartmentConfigService } from './department-config.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DepartmentConfig.name, schema: DepartmentConfigSchema },
        ]),
    ],
    controllers: [DepartmentConfigController],
    providers: [DepartmentConfigService],
    exports: [DepartmentConfigService],
})
export class DepartmentConfigModule {}
