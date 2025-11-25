import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    QnapSession,
    QnapSessionDocument,
} from '@repo/common/models/qnap-session.schema';
import { Model } from 'mongoose';
import { QnapSessionStore } from './session-store.interface';

@Injectable()
export class AtlasSessionStore implements QnapSessionStore {
    constructor(
        @InjectModel(QnapSession.name)
        private readonly model: Model<QnapSessionDocument>,
    ) {}

    async getSid(): Promise<string | null> {
        const session = await this.model
            .findOne({ sessionId: 'CURRENT_SESSION' })
            .lean();
        return session?.sid ?? null;
    }

    async setSid(sid: string | null): Promise<void> {
        if (!sid) {
            await this.model.deleteOne({ sessionId: 'CURRENT_SESSION' });
            return;
        }

        await this.model.updateOne(
            { sessionId: 'CURRENT_SESSION' },
            { $set: { sid, createdAt: new Date() } },
            { upsert: true },
        );
    }
}
