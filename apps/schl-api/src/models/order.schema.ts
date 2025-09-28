import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ required: [true, 'Client name is required'] })
    client_name: string;

    @Prop({ default: '' })
    folder?: string;

    @Prop({ default: null })
    rate?: number | null;

    @Prop({ default: 0 })
    quantity?: number;

    @Prop({ default: '' })
    download_date?: string;

    @Prop({ default: '' })
    delivery_date?: string;

    @Prop({ default: '' })
    delivery_bd_time?: string;

    @Prop({ default: '' })
    task?: string;

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

    @Prop({ default: 'general', enum: ['general', 'test'] })
    type?: 'general' | 'test';

    @Prop({
        default: 'running',
        enum: ['running', 'uploaded', 'paused', 'client-hold', 'finished'],
    })
    status?: 'running' | 'uploaded' | 'paused' | 'client-hold' | 'finished';

    @Prop({ default: '' })
    folder_path?: string;

    @Prop({ default: 'medium', enum: ['low', 'medium', 'high'] })
    priority?: 'low' | 'medium' | 'high';

    @Prop({ default: null })
    updated_by?: string | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
