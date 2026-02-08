import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type LeaveDocument = HydratedDocument<Leave>;

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

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
        ref: 'AttendanceFlag',
        type: mongoose.Schema.Types.ObjectId,
    })
    flag: mongoose.Types.ObjectId; // The type of leave (Sick, Casual, etc. mapped to a Flag like 'SL', 'CL' or generic 'L')

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
