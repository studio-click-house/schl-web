import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NoticeDocument = HydratedDocument<Notice>;

@Schema({ timestamps: true })
export class Notice {
    @Prop({ required: [true, 'Channel is required'] })
    channel: string;

    @Prop({
        required: [true, 'Notice number is required'],
        unique: true,
        index: true,
    })
    notice_no: string;

    @Prop({ required: [true, 'Title is required'] })
    title: string;

    @Prop({ required: [true, 'Description is required'] })
    description: string;

    @Prop({ default: null, type: String })
    file_name?: string | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const NoticeSchema = SchemaFactory.createForClass(Notice);
