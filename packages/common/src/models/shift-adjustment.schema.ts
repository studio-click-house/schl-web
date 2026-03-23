import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import {
    SHIFT_ADJUSTMENT_TYPES,
    SHIFT_TYPES,
    ShiftAdjustmentType,
    ShiftType,
} from '../constants/shift.constant';

export type ShiftAdjustmentDocument = HydratedDocument<ShiftAdjustment>;

@Schema({ timestamps: true, collection: 'shift_adjustments' })
export class ShiftAdjustment {
    @Prop({
        required: [true, 'Employee is required'],
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
        index: true,
    })
    employee: mongoose.Types.ObjectId;

    @Prop({
        required: [true, 'Shift date is required'],
        type: Date,
        index: true,
    })
    shift_date: Date;

    @Prop({
        required: [true, 'Adjustment type is required'],
        type: String,
        enum: SHIFT_ADJUSTMENT_TYPES,
    })
    adjustment_type: ShiftAdjustmentType;

    @Prop({ required: false, type: String, enum: SHIFT_TYPES })
    shift_type?: ShiftType;

    @Prop({ required: false, type: String })
    shift_start?: string; // Format: "HH:mm"

    @Prop({ required: false, type: String })
    shift_end?: string; // Format: "HH:mm"

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight?: boolean;

    @Prop({ required: false, type: Boolean, default: true })
    active: boolean;

    @Prop({ required: false, type: Number, default: 10 })
    grace_period_minutes: number; // Grace window before flagging as late

    @Prop({ required: false, type: String, default: null })
    updated_by: string | null;

    @Prop({ required: false, type: String, default: null })
    comment: string | null;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftAdjustmentSchema =
    SchemaFactory.createForClass(ShiftAdjustment);

ShiftAdjustmentSchema.index(
    { employee: 1, shift_date: 1 },
    { unique: true, name: 'employee_shift_date_unique' },
);
