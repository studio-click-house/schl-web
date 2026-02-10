import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftOverrideDocument = HydratedDocument<ShiftOverride>;

export const SHIFT_OVERRIDE_TYPES = ['replace', 'cancel', 'off_day'] as const;
export type ShiftOverrideType = (typeof SHIFT_OVERRIDE_TYPES)[number];

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

@Schema({ timestamps: true })
export class ShiftOverride {
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
        required: [true, 'Override type is required'],
        type: String,
        enum: SHIFT_OVERRIDE_TYPES,
    })
    override_type: ShiftOverrideType;

    @Prop({ required: false, type: String, enum: SHIFT_TYPES })
    shift_type?: ShiftType;

    @Prop({ required: false, type: String })
    shift_start?: string; // Format: "HH:mm"

    @Prop({ required: false, type: String })
    shift_end?: string; // Format: "HH:mm"

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight?: boolean;

    @Prop({ required: false, type: String, default: null })
    updated_by: string | null;

    @Prop({ required: false, type: String, default: null })
    change_reason: string | null;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftOverrideSchema = SchemaFactory.createForClass(ShiftOverride);

ShiftOverrideSchema.index(
    { employee: 1, shift_date: 1 },
    { unique: true, name: 'employee_shift_date_unique' },
);
