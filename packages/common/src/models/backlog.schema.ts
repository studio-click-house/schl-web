import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import {
    BACKLOG_STATUSES,
    type BacklogStatus,
} from '../constants/backlog.constant';
import { Ticket } from './ticket.schema';
import { User } from './user.schema';

export type BacklogDocument = HydratedDocument<Backlog>;

@Schema({ timestamps: true })
export class Backlog {
    @Prop({
        required: true,
        ref: Ticket.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    ticket: mongoose.Types.ObjectId;

    // Format: https://github.com/user/repo/compare/abc123...def456
    @Prop({ default: '', type: String })
    commit_url: string;

    @Prop({ default: '', type: String })
    commit_message: string;

    @Prop({ default: '', type: String })
    instruction: string;

    @Prop({ enum: BACKLOG_STATUSES, required: true })
    status: BacklogStatus;

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: User.name,
        default: [],
    })
    assigned_to: mongoose.Types.ObjectId[];

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: User.name,
        default: [],
    })
    assigned_by: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const BacklogSchema = SchemaFactory.createForClass(Backlog);
