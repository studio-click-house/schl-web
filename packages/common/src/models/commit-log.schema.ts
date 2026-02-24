import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Ticket } from './ticket.schema';

export type CommitLogDocument = HydratedDocument<CommitLog>;

@Schema({ timestamps: true, collection: 'commit_logs' })
export class CommitLog {
    @Prop({
        required: true,
        index: true,
        ref: Ticket.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    ticket: mongoose.Types.ObjectId;

    // who added this work log / commit
    @Prop({
        required: true,
        index: true,
        ref: 'User',
        type: mongoose.Schema.Types.ObjectId,
    })
    created_by: mongoose.Types.ObjectId;

    // github commit sha
    @Prop({ default: '', type: String })
    sha: string;

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
