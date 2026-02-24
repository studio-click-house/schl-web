import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QcWorkLogDocument = HydratedDocument<QcWorkLog>;

@Schema({ _id: false })
export class PauseReason {
    @Prop({ type: String, required: [true, 'Pause reason is required'] })
    reason: string;

    @Prop({ type: Number, required: [true, 'Pause duration is required'] })
    duration: number;
}

@Schema({ _id: false })
export class QcWorkLogFile {
    @Prop({ type: String, required: [true, 'File name is required'] })
    file_name: string;

    @Prop({ type: String, default: '' })
    file_status?: string;

    @Prop({ type: String, default: '' })
    report?: string;

    @Prop({ type: Number, default: 0 })
    time_spent: number;
}

@Schema({ timestamps: true, collection: 'qc_work_logs' })
export class QcWorkLog {
    @Prop({ type: String, required: [true, 'Employee name is required'] })
    employee_name: string;

    @Prop({ type: String, required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ type: String, required: [true, 'Folder path is required'] })
    folder_path: string;

    @Prop({ type: String, required: [true, 'Shift is required'] })
    shift: string;

    @Prop({ type: String, required: [true, 'Work type is required'] })
    work_type: string;

    @Prop({ type: String, required: [true, 'Date is required'] }) // YYYY-MM-DD
    date_today: string;

    @Prop({ type: Number, default: 0 })
    estimate_time: number;

    @Prop({ type: String, default: '' })
    categories: string;

    @Prop({ type: Number, default: 0 })
    total_times: number;

    @Prop({ type: Number, default: 0 })
    pause_count: number;

    @Prop({ type: Number, default: 0 })
    pause_time: number;

    @Prop({ type: [PauseReason], default: [] })
    pause_reasons: PauseReason[];

    @Prop({ type: [QcWorkLogFile], default: [] })
    files: QcWorkLogFile[];

    @Prop({ type: [String], default: [] })
    processed_sync_ids: string[];
}

export const QcWorkLogSchema = SchemaFactory.createForClass(QcWorkLog);
// Compound index: one batch document per employee+client+folder+shift+workType+date
QcWorkLogSchema.index(
    {
        employee_name: 1,
        client_code: 1,
        folder_path: 1,
        shift: 1,
        work_type: 1,
        date_today: 1,
    },
    { unique: true },
);
