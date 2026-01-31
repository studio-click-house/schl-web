import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
    type AttendanceStatus,
    type VerifyMode,
    ATTENDANCE_STATUSES,
    VERIFY_MODES,
} from '../constants/attendance.constant';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema({})
export class Attendance {
    @Prop({ required: [true, 'Timestamp is required'], type: String })
    timestamp: string; // this is the time when the attendance event occurred

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
        required: [true, 'Status is required'],
        type: String,
        enum: ATTENDANCE_STATUSES,
    })
    status: AttendanceStatus;

    @Prop({ required: [true, 'Source IP is required'], type: String })
    source_ip: string; // IP address of the device that recorded the attendance, stored for auditing & security purposes

    @Prop({ required: false, type: String })
    received_at: string; // this is the time when the record was received by the parser service, stored for debugging purposes
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
