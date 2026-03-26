import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type PauseSessionDocument = HydratedDocument<PauseSession>;

@Schema({ _id: false })
export class PauseSessionReason {
    @Prop({ type: String, required: [true, 'Pause reason is required'] })
    reason: string;

    @Prop({ type: Number, required: [true, 'Pause duration is required'] })
    duration: number;

    @Prop({ type: Date, required: [true, 'Pause start time is required'] })
    started_at: Date;

    @Prop({ type: Date, default: null })
    completed_at?: Date | null;
}

@Schema({ timestamps: true, collection: 'pause_sessions' })
export class PauseSession {
    @Prop({ type: String, required: [true, 'Employee name is required'] })
    employee_name: string;

    @Prop({ type: String, required: [true, 'Date is required'] })
    date_today: string;

    @Prop({ type: String, default: '' })
    client_code: string;

    @Prop({ type: String, default: '' })
    folder_path: string;

    @Prop({ type: String, default: '' })
    work_type: string;

    @Prop({ type: String, default: '' })
    shift: string;

    @Prop({ type: Types.ObjectId, default: null })
    work_log_id?: Types.ObjectId | null;

    @Prop({ type: Number, default: 0 })
    pause_count: number;

    @Prop({ type: Number, default: 0 })
    pause_time: number;

    @Prop({ type: [PauseSessionReason], default: [] })
    pause_reasons: PauseSessionReason[];

    @Prop({ type: [String], default: [] })
    processed_sync_ids: string[];
}

export const PauseSessionSchema = SchemaFactory.createForClass(PauseSession);

PauseSessionSchema.index(
    {
        employee_name: 1,
        date_today: 1,
        client_code: 1,
        folder_path: 1,
        shift: 1,
        work_type: 1,
    },
    { unique: true },
);

PauseSessionSchema.index({ date_today: 1 });
PauseSessionSchema.index({ work_log_id: 1 });
PauseSessionSchema.index({ date_today: 1, work_log_id: 1 });
