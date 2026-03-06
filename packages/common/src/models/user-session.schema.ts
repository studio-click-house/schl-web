import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserSessionDocument = HydratedDocument<UserSession>;

@Schema({ timestamps: true, collection: 'user_sessions' })
export class UserSession {
    @Prop({ type: String, required: true, unique: true })
    session_id: string;

    @Prop({ type: Types.ObjectId, required: true })
    user_id: Types.ObjectId;

    @Prop({ type: String, required: true })
    username: string;

    @Prop({ type: String, required: true })
    user_type: string;

    @Prop({ type: String, required: true })
    session_date: string;

    @Prop({ type: Date, required: true })
    login_at: Date;

    @Prop({ type: Date, default: null })
    logout_at: Date | null;

    @Prop({ type: Number, default: null })
    duration_session: number | null;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Only indexes actually used by queries:
// 1. session_date — every dashboard/live-tracking call filters by date
UserSessionSchema.index({ session_date: 1 });
// 2. Compound — dashboardToday filters by username + session_date
UserSessionSchema.index({ username: 1, session_date: 1, login_at: -1 });
