import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LEAVE_TYPES } from '@repo/common/constants/leave.constant';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import { AttendanceFlag } from './attendance-flag.schema';

export type LeaveDocument = HydratedDocument<Leave>;

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

// LEAVE_TYPES is centralized in @repo/common/constants/leave.constant

@Schema({ timestamps: true })
export class Leave {
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

    @Prop({ required: true, type: String, enum: LEAVE_TYPES as any })
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
        enum: LEAVE_STATUSES,
        default: 'pending',
    })
    status: LeaveStatus;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    approved_by?: mongoose.Types.ObjectId;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);
