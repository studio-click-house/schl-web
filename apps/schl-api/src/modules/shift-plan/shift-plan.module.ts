import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    ShiftAdjustment,
    ShiftAdjustmentSchema,
} from '@repo/common/models/shift-adjustment.schema';
import {
    ShiftResolved,
    ShiftResolvedSchema,
} from '@repo/common/models/shift-resolved.schema';
import {
    ShiftPlan,
    ShiftPlanSchema,
} from '@repo/common/models/shift-plan.schema';
import { ShiftPlanController } from './shift-plan.controller';
import { ShiftPlanSchedulerService } from './shift-plan-scheduler.service';
import { ShiftPlanService } from './shift-plan.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ShiftPlan.name, schema: ShiftPlanSchema },
            { name: ShiftAdjustment.name, schema: ShiftAdjustmentSchema },
            { name: ShiftResolved.name, schema: ShiftResolvedSchema },
        ]),
    ],
    controllers: [ShiftPlanController],
    providers: [ShiftPlanService, ShiftPlanSchedulerService],
    exports: [ShiftPlanService],
})
export class ShiftPlanModule {}
