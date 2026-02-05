import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import {
    HALF_DAY_PERIODS,
    HOLIDAY_TARGET_TYPES,
    HOLIDAY_TYPES,
    LEAVE_PAYMENT_TYPES,
    SHIFT_TYPES,
    type HalfDayPeriod,
    type HolidayTargetType,
    type HolidayType,
    type LeavePaymentType,
    type ShiftType,
} from '../constants/shift.constant';

export type HolidayDocument = HydratedDocument<Holiday>;

/**
 * Holiday/Leave Schema
 * Represents company holidays, vacations, and leaves that can be applied to:
 * - All employees
 * - Employees on a specific shift
 * - Individual employees
 */
@Schema({ timestamps: true })
export class Holiday {
    @Prop({ required: [true, 'Title is required'], type: String })
    title: string; // e.g., "Eid-ul-Fitr", "Annual Vacation"

    @Prop({ required: false, type: String, default: '' })
    description: string;

    @Prop({
        required: [true, 'Holiday type is required'],
        type: String,
        enum: HOLIDAY_TYPES,
    })
    holiday_type: HolidayType; // full_day, half_day, vacation

    @Prop({
        required: false,
        type: String,
        enum: HALF_DAY_PERIODS,
        default: null,
    })
    half_day_period: HalfDayPeriod | null; // only for half_day type

    @Prop({
        required: [true, 'Payment type is required'],
        type: String,
        enum: LEAVE_PAYMENT_TYPES,
    })
    payment_type: LeavePaymentType; // paid or unpaid

    @Prop({
        required: [true, 'Start date is required'],
        type: Date,
        index: true,
    })
    start_date: Date;

    @Prop({
        required: [true, 'End date is required'],
        type: Date,
    })
    end_date: Date; // same as start_date for single-day holidays

    // Targeting configuration
    @Prop({
        required: [true, 'Target type is required'],
        type: String,
        enum: HOLIDAY_TARGET_TYPES,
    })
    target_type: HolidayTargetType; // all, shift, individual

    @Prop({
        required: false,
        type: String,
        enum: SHIFT_TYPES,
        default: null,
    })
    target_shift: ShiftType | null; // only for target_type: 'shift'

    @Prop({
        required: false,
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
        default: [],
    })
    target_employees: mongoose.Types.ObjectId[]; // only for target_type: 'individual'

    @Prop({ required: false, type: Boolean, default: true })
    is_active: boolean;

    @Prop({
        required: false,
        ref: 'User',
        type: mongoose.Schema.Types.ObjectId,
    })
    created_by: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);

// Index for date range queries
HolidaySchema.index({ start_date: 1, end_date: 1 });

// Index for filtering by target type and shift
HolidaySchema.index({ target_type: 1, target_shift: 1 });
