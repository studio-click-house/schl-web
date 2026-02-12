import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftTemplateDocument = HydratedDocument<ShiftTemplate>;

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

@Schema({ timestamps: true, collection: 'shift_templates' })
export class ShiftTemplate {
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

    @Prop({ required: false, type: String, default: null })
    updated_by: string | null;

    @Prop({ required: false, type: String, default: null })
    change_reason: string | null;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftTemplateSchema = SchemaFactory.createForClass(ShiftTemplate);

ShiftTemplateSchema.index(
    { employee: 1, effective_from: 1, effective_to: 1, active: 1 },
    { name: 'employee_effective_range' },
);
