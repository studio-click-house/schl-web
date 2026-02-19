import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Ticket } from './ticket.schema';

export type CommitLogDocument = HydratedDocument<CommitLog>;

@Schema({ timestamps: true })
export class CommitLog {
    @Prop({
        required: true,
        index: true,
        ref: Ticket.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    ticket: mongoose.Types.ObjectId;

    // github commit url
    @Prop({ default: '', type: String })
    url: string;

    @Prop({ type: String })
    message: string;

    @Prop({ type: String })
    description: string;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const CommitLogSchema = SchemaFactory.createForClass(CommitLog);
