import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Ticket } from './ticket.schema';
import { User } from './user.schema';

export type DailyReportDocument = HydratedDocument<DailyReport>;

@Schema({ timestamps: true, collection: 'daily_reports' })
export class DailyReport {
    // who added this work  / update
    @Prop({
        index: true,
        ref: User.name,
        type: mongoose.Schema.Types.ObjectId,
    })
    submitted_by: mongoose.Types.ObjectId;

    @Prop({ type: String })
    message: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: Ticket.name,
        default: null,
    })
    ticket: mongoose.Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    is_verified: boolean;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: User.name,
        default: null,
    })
    verified_by: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);

// index ticket reference for lookups and compound with submitter if required
DailyReportSchema.index({ ticket: 1 });
DailyReportSchema.index({ submitted_by: 1, createdAt: -1 });
