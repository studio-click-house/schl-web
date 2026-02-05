import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { SHIFT_TYPES, type ShiftType } from '../constants/shift.constant';

export type ShiftScheduleDocument = HydratedDocument<ShiftSchedule>;

/**
 * Shift Schedule
 * Tracks which shift an employee is assigned to for a specific date range.
 * Supports flexible date ranges that don't have to align with calendar weeks.
 */
@Schema({ timestamps: true })
export class ShiftSchedule {
    @Prop({
        required: [true, 'Employee is required'],
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
        index: true,
    })
    employee: mongoose.Types.ObjectId;

    @Prop({
        required: [true, 'Shift is required'],
        ref: 'Shift',
        type: mongoose.Schema.Types.ObjectId,
    })
    shift: mongoose.Types.ObjectId;

    @Prop({
        required: [true, 'Shift type is required'],
        type: String,
        enum: SHIFT_TYPES,
    })
    shift_type: ShiftType; // denormalized for quick filtering

    @Prop({
        required: [true, 'Start date is required'],
        type: Date,
        index: true,
    })
    start_date: Date; // Start of the shift assignment period

    @Prop({
        required: [true, 'End date is required'],
        type: Date,
    })
    end_date: Date; // End of the shift assignment period

    @Prop({ required: false, type: String, default: '' })
    notes: string; // optional notes for the assignment

    @Prop({
        required: false,
        ref: 'User',
        type: mongoose.Types.ObjectId,
    })
    assigned_by: mongoose.Types.ObjectId; // who made this assignment

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const ShiftScheduleSchema = SchemaFactory.createForClass(ShiftSchedule);

// Compound index to ensure no overlapping schedules for same employee
// Note: This doesn't prevent overlaps by itself, service logic handles that
ShiftScheduleSchema.index({ employee: 1, start_date: 1 }, { unique: true });

// Index for querying by shift type and date range
ShiftScheduleSchema.index({ shift_type: 1, start_date: 1 });
