import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SHIFT_TYPES, type ShiftType } from '../constants/shift.constant';

export type ShiftDocument = HydratedDocument<Shift>;

@Schema({ timestamps: true })
export class Shift {
    @Prop({
        required: [true, 'Shift type is required'],
        type: String,
        enum: SHIFT_TYPES,
        unique: true,
    })
    type: ShiftType;

    @Prop({ required: [true, 'Shift name is required'], type: String })
    name: string; // e.g., "Morning Shift", "Evening Shift"

    @Prop({ required: [true, 'Start time is required'], type: String })
    start_time: string; // HH:mm format (24-hour)

    @Prop({ required: [true, 'End time is required'], type: String })
    end_time: string; // HH:mm format (24-hour)

    @Prop({ required: false, type: Number, default: 15 })
    grace_minutes: number; // grace period for late arrival

    @Prop({ required: false, type: Boolean, default: false })
    crosses_midnight: boolean; // true if shift ends after midnight (for evening shifts)

    @Prop({ required: false, type: Boolean, default: true })
    is_active: boolean;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
