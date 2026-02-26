import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type DailyUpdateDocument = HydratedDocument<DailyUpdate>;

@Schema({ timestamps: true, collection: 'daily_updates' })
export class DailyUpdate {
    // who added this work log / commit
    @Prop({
        index: true,
        ref: 'User',
        type: mongoose.Schema.Types.ObjectId,
    })
    submitted_by: mongoose.Types.ObjectId;

    @Prop({ type: String })
    message: string;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const DailyUpdateSchema = SchemaFactory.createForClass(DailyUpdate);
