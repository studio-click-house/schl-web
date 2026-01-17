import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkLogDocument = HydratedDocument<WorkLog>;

@Schema({ _id: false })
export class WorkLogFile {
    @Prop({ type: String, required: [true, 'Folder path is required'] })
    folder_path: string;

    @Prop({ type: String, required: [true, 'File name is required'] })
    file_name: string;

    @Prop({ type: Number, required: [true, 'Time spent is required'] })
    time_spent: number;

    @Prop({ type: Number, default: 0 })
    pause_count: number;

    @Prop({ type: String, default: '' })
    categories: string;

    @Prop({ type: String, required: [true, 'File status is required'] })
    file_status: string;

    @Prop({ type: Date, default: Date.now })
    started_at?: Date;

    @Prop({ type: Date, default: null })
    completed_at?: Date;

    @Prop({ type: Number, default: 0 })
    pause_time: number;
}

@Schema({ timestamps: true })
export class WorkLog {
    @Prop({ type: String, required: [true, 'Employee name is required'] })
    employee_name: string;

    @Prop({ type: String, required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ type: String, required: [true, 'Shift is required'] })
    shift: string;

    @Prop({ type: String, required: [true, 'Work type is required'] })
    work_type: string;

    @Prop({ type: String, required: [true, 'Date is required'] }) // YYYY-MM-DD
    date_today: string;

    @Prop({ type: [WorkLogFile], default: [] })
    files: WorkLogFile[];
}

export const WorkLogSchema = SchemaFactory.createForClass(WorkLog);
// Create compound index for the unique bucket key
WorkLogSchema.index(
    { employee_name: 1, client_code: 1, shift: 1, work_type: 1, date_today: 1 },
    { unique: true },
);
