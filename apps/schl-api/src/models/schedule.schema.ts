import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScheduleDocument = HydratedDocument<Schedule>;

@Schema({ timestamps: true })
export class Schedule {
    @Prop({ required: [true, 'Receive date is required'] })
    receive_date: string;

    @Prop({ required: [true, 'Delivery date is required'] })
    delivery_date: string;

    @Prop({ required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ required: [true, 'Client name is required'] })
    client_name: string;

    @Prop({ required: [true, 'Task is required'] })
    task: string;

    @Prop({ default: '' })
    comment?: string;

    @Prop({ default: null })
    updated_by?: string | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
