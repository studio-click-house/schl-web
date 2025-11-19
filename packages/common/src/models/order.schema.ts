import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {
    JOB_SHIFTS,
    ORDER_PRIORITIES,
    ORDER_STATUSES,
    ORDER_TYPES,
    type JobShift,
    type OrderPriority,
    type OrderStatus,
    type OrderType,
} from '../constants/order.constant';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false, timestamps: false })
class OrderFilesTracking {
    @Prop({ required: [true, 'File name is required'] })
    file_name: string;

    @Prop({ required: [true, 'Start timestamp is required'], type: Date })
    start_timestamp: Date;

    @Prop({ default: null, type: Date })
    end_timestamp: Date | null;

    @Prop({ default: false })
    is_paused: boolean;

    @Prop({ default: 0 })
    total_pause_duration: number;

    @Prop({ default: null, type: Date })
    pause_start_timestamp: Date | null;

    @Prop({ default: false })
    is_completed: boolean;
}

@Schema({ _id: false, timestamps: false })
class OrderProgress {
    @Prop({
        required: [true, 'Employee has not been assigned'],
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
    })
    employee: mongoose.Types.ObjectId;

    @Prop({ required: [true, 'Shift is required'], enum: JOB_SHIFTS })
    shift: JobShift;

    @Prop({ default: false })
    is_qc: boolean;

    @Prop({
        type: Number,
        default: function (this: OrderProgress) {
            // Leave undefined when QC is enabled so validation can ensure value > 0
            return this && this.is_qc === true ? undefined : 0;
        },
        required: [
            function (this: OrderProgress) {
                return !!(this && this.is_qc);
            },
            'QC step is required when QC is enabled',
        ],
        validate: {
            validator: function (this: OrderProgress, value: number | null) {
                if (this.is_qc) {
                    return value !== null && value > 0;
                }
                return true;
            },
            message: 'QC step must be greater than 0 when QC is enabled',
        },
    })
    qc_step: number | null;

    @Prop({ type: [OrderFilesTracking], default: [] })
    files_tracking: OrderFilesTracking[];
}

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ required: [true, 'Client name is required'] })
    client_name: string;

    @Prop({ default: '' })
    folder: string;

    @Prop({ default: null, type: Number })
    rate: number | null;

    @Prop({ default: 0 })
    quantity: number;

    @Prop({ required: [true, 'Download date is required'] })
    download_date: string;

    @Prop({ default: '' })
    delivery_date: string;

    @Prop({ default: '' })
    delivery_bd_time: string;

    @Prop({ required: [true, 'Task is required'] })
    task: string;

    @Prop({ default: 0 })
    et: number;

    @Prop({ default: 0 })
    production: number;

    @Prop({ default: 0 })
    qc1: number;

    @Prop({ default: 0 })
    qc2: number;

    @Prop({ default: '' })
    comment: string;

    @Prop({ default: 'general', enum: ORDER_TYPES })
    type: OrderType;

    @Prop({
        default: 'running',
        enum: ORDER_STATUSES,
    })
    status: OrderStatus;

    @Prop({ default: '' })
    folder_path: string;

    @Prop({ default: 'medium', enum: ORDER_PRIORITIES })
    priority: OrderPriority;

    @Prop({ type: [OrderProgress], default: [] })
    progress: OrderProgress[];

    @Prop({ type: String, default: null })
    updated_by: string | null;

    readonly createdAt: Date;

    readonly updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
