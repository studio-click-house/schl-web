import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserSessionDocument = HydratedDocument<UserSession>;

@Schema({ timestamps: true, collection: 'user_sessions' })
export class UserSession {
    @Prop({ type: String, required: true, unique: true, index: true })
    session_id: string;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: String, required: true, index: true })
    username: string;

    @Prop({ type: String, required: true, index: true })
    user_type: string;

    @Prop({ type: String, required: true, index: true })
    session_date: string;

    @Prop({ type: Date, required: true, index: true })
    login_at: Date;

    @Prop({ type: Date, default: null, index: true })
    logout_at: Date | null;

    @Prop({ type: Number, default: null })
    duration_session: number | null;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

UserSessionSchema.index({ user_id: 1, login_at: -1 });
UserSessionSchema.index({ user_type: 1, session_date: 1, login_at: -1 });
UserSessionSchema.index({ username: 1, session_date: 1, login_at: -1 });
