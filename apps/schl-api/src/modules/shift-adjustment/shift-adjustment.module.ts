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
import { ShiftAdjustmentController } from './shift-adjustment.controller';
import { ShiftAdjustmentService } from './shift-adjustment.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ShiftAdjustment.name, schema: ShiftAdjustmentSchema },
            { name: ShiftResolved.name, schema: ShiftResolvedSchema },
        ]),
    ],
    controllers: [ShiftAdjustmentController],
    providers: [ShiftAdjustmentService],
    exports: [ShiftAdjustmentService],
})
export class ShiftAdjustmentModule {}
