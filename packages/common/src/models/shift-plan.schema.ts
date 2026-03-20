import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { SHIFT_TYPES, ShiftType } from '../constants/shift.constant';

export type ShiftPlanDocument = HydratedDocument<ShiftPlan>;

@Schema({ timestamps: true, collection: 'shift_plans' })
export class ShiftPlan {
    @Prop({
        required: [true, 'Employee is required'],
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
        index: true,
    })
    employee: mongoose.Types.ObjectId;

    @Prop({
        required: [true, 'Effective from date is required'],
        type: Date,
        index: true,
    })
    effective_from: Date;

    @Prop({
        required: [true, 'Effective to date is required'],
        type: Date,
        index: true,
    })
    effective_to: Date;

    @Prop({
        required: [true, 'Shift type is required'],
        type: String,
        enum: SHIFT_TYPES,
    })
    shift_type: ShiftType;

    @Prop({ required: [true, 'Shift start time is required'], type: String })
    shift_start: string; // Format: "HH:mm"

    @Prop({ required: [true, 'Shift end time is required'], type: String })
    shift_end: string; // Format: "HH:mm"

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight: boolean;

    @Prop({ required: false, type: Boolean, default: true })
    active: boolean;

    @Prop({ required: false, type: Number, default: 10 })
    grace_period_minutes: number; // Lateness grace window in minutes before flagging as late

    @Prop({ required: false, type: String, default: null })
    updated_by: string | null;

    @Prop({ required: false, type: String, default: null })
    comment: string | null;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftPlanSchema = SchemaFactory.createForClass(ShiftPlan);

ShiftPlanSchema.index(
    { employee: 1, effective_from: 1, effective_to: 1, active: 1 },
    { name: 'employee_effective_range' },
);
