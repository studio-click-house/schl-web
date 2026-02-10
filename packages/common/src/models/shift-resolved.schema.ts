import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ShiftResolvedDocument = HydratedDocument<ShiftResolved>;

export const SHIFT_RESOLVED_SOURCES = [
    'template',
    'override',
    'leave',
    'holiday',
] as const;
export type ShiftResolvedSource = (typeof SHIFT_RESOLVED_SOURCES)[number];

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

@Schema({ timestamps: true })
export class ShiftResolved {
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
        required: [true, 'Shift type is required'],
        type: String,
        enum: SHIFT_TYPES,
    })
    shift_type: ShiftType;

    @Prop({ required: [true, 'Shift start time is required'], type: String })
    shift_start: string;

    @Prop({ required: [true, 'Shift end time is required'], type: String })
    shift_end: string;

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight: boolean;

    @Prop({ required: false, type: Boolean, default: false })
    is_off_day_overtime?: boolean; // If true, treat any work on this day as overtime (off-day OT)


    @Prop({
        required: [true, 'Resolved source is required'],
        type: String,
        enum: SHIFT_RESOLVED_SOURCES,
    })
    source: ShiftResolvedSource;

    @Prop({ required: false, type: mongoose.Schema.Types.ObjectId })
    template_id?: mongoose.Types.ObjectId;

    @Prop({ required: false, type: mongoose.Schema.Types.ObjectId })
    override_id?: mongoose.Types.ObjectId;

    @Prop({ required: true, type: Date })
    resolved_at: Date;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftResolvedSchema = SchemaFactory.createForClass(ShiftResolved);

ShiftResolvedSchema.index(
    { employee: 1, shift_date: 1 },
    { unique: true, name: 'employee_shift_date_unique' },
);
