import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkLogDocument = HydratedDocument<WorkLog>;

@Schema({ _id: false })
export class WorkLogFile {
    @Prop({ type: String, required: [true, 'Folder path is required'] })
    folderPath: string;

    @Prop({ type: String, required: [true, 'File name is required'] })
    fileName: string;

    @Prop({ type: Number, required: [true, 'Time spent is required'] })
    timeSpent: number;

    @Prop({ type: Number, default: 0 })
    pauseCount: number;

    @Prop({ type: String, default: '' })
    categories: string;

    @Prop({ type: String, required: [true, 'File status is required'] })
    fileStatus: string;

    @Prop({ type: Date, default: Date.now })
    startedAt?: Date;

    @Prop({ type: Date, default: null })
    completedAt?: Date;

    @Prop({ type: Number, default: 0 })
    pauseTime: number;
}

@Schema({ timestamps: true })
export class WorkLog {
    @Prop({ type: String, required: [true, 'Employee name is required'] })
    employeeName: string;

    @Prop({ type: String, required: [true, 'Client code is required'] })
    clientCode: string;

    @Prop({ type: String, required: [true, 'Shift is required'] })
    shift: string;

    @Prop({ type: String, required: [true, 'Work type is required'] })
    workType: string;

    @Prop({ type: String, required: [true, 'Date is required'] }) // YYYY-MM-DD
    dateToday: string;

    @Prop({ type: [WorkLogFile], default: [] })
    files: WorkLogFile[];
}

export const WorkLogSchema = SchemaFactory.createForClass(WorkLog);
// Create compound index for the unique bucket key
WorkLogSchema.index(
    { employeeName: 1, clientCode: 1, shift: 1, workType: 1, dateToday: 1 },
    { unique: true },
);
