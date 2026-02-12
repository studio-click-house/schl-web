import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import {
    type AttendanceStatus,
    type VerifyMode,
    ATTENDANCE_STATUSES,
    VERIFY_MODES,
} from '../constants/attendance.constant';
import { AttendanceFlag } from './attendance-flag.schema';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema()
export class Attendance {
    @Prop({ required: [true, 'In-time is required'], type: Date, index: true })
    in_time: Date;

    @Prop({ required: false, type: String, default: '' })
    in_remark: string;

    @Prop({ required: false, type: Date, default: null })
    out_time: Date | null;

    @Prop({ required: false, type: String, default: '' })
    out_remark: string;

    @Prop({ required: [true, 'Device ID is required'], type: String })
    device_id: string; // ID of the device that recorded the attendance, stored for auditing & security purposes

    @Prop({ required: [true, 'User ID is required'], type: String })
    user_id: string; // ID of the user (set in the device) whose attendance is being recorded

    @Prop({
        required: [true, 'Verify mode is required'],
        type: String,
        enum: VERIFY_MODES,
    })
    verify_mode: VerifyMode;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'attendance_flags',
        required: false,
    })
    flag?: mongoose.Types.ObjectId;

    @Prop({ required: false, type: Number, default: 0 })
    late_minutes: number;

    @Prop({
        required: [true, 'Status is required'],
        type: String,
        enum: ATTENDANCE_STATUSES,
    })
    status: AttendanceStatus;

    @Prop({ required: [true, 'Source IP is required'], type: String })
    source_ip: string; // IP address of the device that recorded the attendance, stored for auditing & security purposes

    @Prop({ required: false, type: Date, default: null })
    received_at: Date | null; // this is the time when the record was received by the parser service, stored for debugging purposes

    @Prop({ required: false, type: Number, default: 1 })
    total_checkins: number; // Number of check-in/check-out events for this attendance (1st = in, 2nd+ = out updates)

    @Prop({
        required: [true, 'Employee is required'],
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
    })
    employee: mongoose.Types.ObjectId; // reference to employee document, resolved from device-user mapping

    @Prop({
        required: [true, 'Shift date is required'],
        type: Date,
        index: true,
    })
    shift_date: Date; // Business day this attendance belongs to (e.g., 2026-02-07 even if checkout is 2026-02-08 01:30)

    @Prop({ required: false, type: Number, default: 0 })
    ot_minutes: number; // Calculated overtime in minutes (cached for performance)

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Enforce only one open session per user per shift date at the database level
// Partial unique index ensures only one document with out_time: null per user per shift_date
AttendanceSchema.index(
    { user_id: 1, shift_date: 1 },
    {
        unique: true,
        partialFilterExpression: { out_time: null },
    },
);
