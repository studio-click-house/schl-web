import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LEAVE_REQUEST_TYPES } from '@repo/common/constants/leave-request.constant';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { AttendanceFlag } from './attendance-flag.schema';

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

export const LEAVE_REQUEST_STATUSES = [
    'pending',
    'approved',
    'rejected',
] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

// LEAVE_REQUEST_TYPES is centralized in @repo/common/constants/leave-request.constant

@Schema({ timestamps: true, collection: 'leave_requests' })
export class LeaveRequest {
    @Prop({
        required: true,
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
        index: true,
    })
    employee: mongoose.Types.ObjectId;

    @Prop({
        required: true,
        ref: AttendanceFlag.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    flag: mongoose.Types.ObjectId; // The flag (usually generic 'L' for leaves')

    @Prop({ required: true, type: String, enum: LEAVE_REQUEST_TYPES as any })
    leave_type: string; // 'casual' | 'emergency' | 'marriage' | 'unpaid'

    @Prop({ default: true })
    is_paid: boolean; // Whether this particular leave is paid or unpaid

    @Prop({ required: true, type: Date })
    start_date: Date;

    @Prop({ required: true, type: Date })
    end_date: Date;

    @Prop({ required: true, type: String })
    reason: string;

    @Prop({
        required: true,
        type: String,
        enum: LEAVE_REQUEST_STATUSES,
        default: 'pending',
    })
    status: LeaveRequestStatus;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    approved_by?: mongoose.Types.ObjectId;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
