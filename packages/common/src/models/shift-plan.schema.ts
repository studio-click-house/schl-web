import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftPlanDocument = HydratedDocument<ShiftPlan>;

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

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
        required: [true, 'Shift date is required'],
        type: Date,
        index: true,
    })
    shift_date: Date; // The business day this shift belongs to

    @Prop({
        required: [true, 'Shift type is required'],
        type: String,
        enum: SHIFT_TYPES,
    })
    shift_type: ShiftType;

    @Prop({ required: [true, 'Shift start time is required'], type: String })
    shift_start: string; // Format: "HH:mm" (e.g., "15:00" for 3 PM)

    @Prop({ required: [true, 'Shift end time is required'], type: String })
    shift_end: string; // Format: "HH:mm" (e.g., "23:00" for 11 PM)

    @Prop({ required: false, type: Number, default: 10 })
    grace_period_minutes: number; // Late in-time tolerance (default: 10 mins). Does not affect OT calculation.

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight: boolean; // True if shift_end < shift_start (e.g., 15:00-01:00)

    @Prop({ required: false, type: String, default: null })
    updated_by: string | null; // User ID who last updated this shift plan

    @Prop({ required: false, type: String, default: null })
    change_reason: string | null; // Reason for schedule change (e.g., "Christmas special", "Eid break")

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftPlanSchema = SchemaFactory.createForClass(ShiftPlan);

// Ensure one shift per employee per day
ShiftPlanSchema.index({ employee: 1, shift_date: 1 }, { unique: true });
