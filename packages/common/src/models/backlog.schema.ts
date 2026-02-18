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
export class Commit {
    @Prop({ type: String, required: true })
    url: string;

    @Prop({ required: true, type: String })
    message: string;

    @Prop({ type: String, default: '' })
    description: string;
}

@Schema({ timestamps: true })
export class Backlog {
    @Prop({
        required: true,
        index: true,
        ref: Ticket.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    ticket: mongoose.Types.ObjectId;

    // Format: https://github.com/user/repo/compare/abc123...def456
    // enforced in api when closing a backlog
    @Prop({ default: '', type: String })
    diff_url: string;

    // enforced in api when closing a backlog
    @Prop({ default: '', type: String })
    completion_note: string;

    @Prop({ type: [Commit], default: [] })
    commit_history: Commit[];

    @Prop({ default: '', type: String })
    task_description: string;

    @Prop({ enum: BACKLOG_STATUSES, required: true, index: true })
    status: BacklogStatus;

    @Prop({
        type: [mongoose.Schema.Types.ObjectId],
        ref: User.name,
        index: true,
        default: [],
    })
    assigned_to: mongoose.Types.ObjectId[];

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: User.name,
    })
    assigned_by: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const BacklogSchema = SchemaFactory.createForClass(Backlog);
