import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'qnap_sessions', timestamps: true })
export class QnapSession {
    @Prop({ required: true, unique: true })
    sessionId: string;

    @Prop({ required: true })
    sid: string;

    // TTL Index: MongoDB will automatically remove this doc 30 mins after creation
    @Prop({ required: true, index: { expires: 1800 } })
    createdAt: Date;
}

export const QnapSessionSchema = SchemaFactory.createForClass(QnapSession);
export type QnapSessionDocument = HydratedDocument<QnapSession>;
