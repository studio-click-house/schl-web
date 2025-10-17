import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
    ORDER_PRIORITIES,
    ORDER_STATUSES,
    ORDER_TYPES,
    type OrderPriority,
    type OrderStatus,
    type OrderType,
} from 'src/common/constants/order.constant';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ required: [true, 'Client name is required'] })
    client_name: string;

    @Prop({ default: '' })
    folder?: string;

    @Prop({ default: null, type: Number })
    rate?: number | null;

    @Prop({ default: 0 })
    quantity?: number;

    @Prop({ required: [true, 'Download date is required'] })
    download_date: string;

    @Prop({ default: '' })
    delivery_date?: string;

    @Prop({ default: '' })
    delivery_bd_time?: string;

    @Prop({ required: [true, 'Task is required'] })
    task: string;

    @Prop({ default: 0 })
    et?: number;

    @Prop({ default: 0 })
    production?: number;

    @Prop({ default: 0 })
    qc1?: number;

    @Prop({ default: 0 })
    qc2?: number;

    @Prop({ default: '' })
    comment?: string;

    @Prop({ default: 'general', enum: ORDER_TYPES })
    type?: OrderType;

    @Prop({
        default: 'running',
        enum: ORDER_STATUSES,
    })
    status?: OrderStatus;

    @Prop({ default: '' })
    folder_path?: string;

    @Prop({ default: 'medium', enum: ORDER_PRIORITIES })
    priority?: OrderPriority;

    @Prop({ type: String, default: null })
    updated_by?: string | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
