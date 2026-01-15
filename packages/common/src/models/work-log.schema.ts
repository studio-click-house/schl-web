import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkLogDocument = HydratedDocument<WorkLog>;

@Schema({ _id: false }) // Sub-document schema
export class WorkLogFile {
    @Prop({ name: 'folder_path', required: true })
    folder_path: string;

    @Prop({ name: 'file_name', required: true })
    file_name: string;

    @Prop({ name: 'time_spent', required: true })
    time_spent: number;

    @Prop({ name: 'pause_count', default: 0 })
    pause_count: number;

    @Prop({ name: 'categories', type: String, default: '' })
    categories: string;

    @Prop({ name: 'file_status', required: true })
    file_status: string;

    @Prop({ name: 'started_at', type: Date })
    started_at?: Date;

    @Prop({ name: 'completed_at', type: Date })
    completed_at?: Date;

    @Prop({ name: 'pause_time', default: 0 })
    pause_time: number;
}
export const WorkLogFileSchema = SchemaFactory.createForClass(WorkLogFile);

@Schema({
    collection: 'employ_file_data',
    timestamps: true, // Use default MongoDB createdAt and updatedAt
})
export class WorkLog {
    @Prop({ name: 'employee_name', required: true })
    employee_name: string;

    @Prop({ name: 'client_code', required: true })
    client_code: string;

    @Prop({ name: 'shift', required: true })
    shift: string;

    @Prop({ name: 'work_type', required: true })
    work_type: string;

    @Prop({ name: 'date_today', required: true }) // YYYY-MM-DD
    date_today: string;


    @Prop({ type: [WorkLogFileSchema], default: [] })
    files: WorkLogFile[];
}




export const WorkLogSchema = SchemaFactory.createForClass(WorkLog);
// Create compound index for the unique bucket key
WorkLogSchema.index(
    { employee_name: 1, client_code: 1, shift: 1, work_type: 1, date_today: 1 },
    { unique: true },
);
// Force Schema Refresh
