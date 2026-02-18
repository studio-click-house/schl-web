import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {
    TICKET_STATUSES,
    TICKET_TYPES,
    type TicketStatus,
    type TicketType,
} from '../constants/ticket.constant';
import { User } from './user.schema';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
    /*
    Format: SCHL-T202601-0001

    SCHL = Studio Click House Ltd.
    T = Ticket
    202601 = Year and Month (e.g., January 2026)
    0001 = Sequential Number (e.g., 0001, 0002, 123456 etc.)
    */
    @Prop({ required: true, unique: true, index: true })
    ticket_number: string;

    @Prop({
        required: true,
        ref: User.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    opened_by: mongoose.Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ enum: TICKET_STATUSES, required: true })
    status: TicketStatus;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ enum: TICKET_TYPES, required: true })
    type: TicketType;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: User.name,
        default: null,
    })
    checked_by: mongoose.Types.ObjectId | null;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
