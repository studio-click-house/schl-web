import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Order } from './order.schema';
import { User } from './user.schema';

export type OrderLogDocument = HydratedDocument<OrderLog>;

@Schema({
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'order_logs',
})
export class OrderLog {
    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: Order.name,
        required: true,
        index: true,
    })
    order: mongoose.Types.ObjectId;

    @Prop({
        type: String,
        enum: ['Create', 'Update', 'Finish', 'Redo', 'Delete'],
        required: true,
    })
    action: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: User.name,
        required: true,
    })
    user: mongoose.Types.ObjectId;

    readonly createdAt: Date;
}

export const OrderLogSchema = SchemaFactory.createForClass(OrderLog);
