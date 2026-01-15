import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TrackerUserDocument = HydratedDocument<TrackerUser>;

@Schema({ collection: 'app_users', timestamps: true })
export class TrackerUser {
    @Prop({ required: true, unique: true })
    username: string;

    @Prop({ required: false, default: null })
    password: string | null;

    @Prop({ default: false })
    isPasswordSet: boolean;

    @Prop({ default: 'Employee' })
    role: string;
}

export const TrackerUserSchema = SchemaFactory.createForClass(TrackerUser);
