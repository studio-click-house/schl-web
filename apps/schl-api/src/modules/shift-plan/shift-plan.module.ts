import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ShiftOverride,
    ShiftOverrideSchema,
} from '@repo/common/models/shift-override.schema';
import {
    ShiftResolved,
    ShiftResolvedSchema,
} from '@repo/common/models/shift-resolved.schema';
import {
    ShiftTemplate,
    ShiftTemplateSchema,
} from '@repo/common/models/shift-template.schema';
import { ShiftPlanController } from './shift-plan.controller';
import { ShiftPlanService } from './shift-plan.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ShiftTemplate.name, schema: ShiftTemplateSchema },
            { name: ShiftOverride.name, schema: ShiftOverrideSchema },
            { name: ShiftResolved.name, schema: ShiftResolvedSchema },
        ]),
    ],
    controllers: [ShiftPlanController],
    providers: [ShiftPlanService],
    exports: [ShiftPlanService],
})
export class ShiftPlanModule {}
