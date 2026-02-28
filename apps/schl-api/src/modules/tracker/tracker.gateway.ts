import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { UserSession } from '@repo/common/models/user-session.schema';
import { Model } from 'mongoose';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/tracker', cors: { origin: '*' } })
export class TrackerGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly allowedLiveTrackingRoles = new Set([
        'admin',
        'superadmin',
        'super admin',
    ]);

    constructor(
        @InjectModel(UserSession.name)
        private readonly userSessionModel: Model<UserSession>,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(_server: Server) {
        void _server;
        console.log('TrackerGateway initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client connected to Tracker namespace: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from Live Tracking: ${client.id}`);
    }

    @SubscribeMessage('SUBSCRIBE_LIVE_TRACKING')
    async handleSubscribe(
        client: Socket,
        payload: { sessionId?: string; username?: string },
    ) {
        try {
            const sessionId =
                typeof payload?.sessionId === 'string'
                    ? payload.sessionId.trim()
                    : '';
            const username =
                typeof payload?.username === 'string'
                    ? payload.username.trim().toLowerCase()
                    : '';

            if (!sessionId || !username) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Missing session or username',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Missing session or username' };
            }

            const session = await this.userSessionModel
                .findOne({ session_id: sessionId })
                .lean()
                .exec();

            if (!session) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Invalid session',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Invalid session' };
            }

            if (session.logout_at) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Session is logged out',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Session is logged out' };
            }

            const sessionUsername = String(session.username || '')
                .trim()
                .toLowerCase();
            if (!sessionUsername || sessionUsername !== username) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Session does not match username',
                });
                client.disconnect(true);
                return {
                    ok: false,
                    reason: 'Session does not match username',
                };
            }

            const role = String(session.user_type || '')
                .trim()
                .toLowerCase();
            if (!this.allowedLiveTrackingRoles.has(role)) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Role not allowed',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Role not allowed' };
            }

            void client.join('live-tracking');
            void client.join(`tracker-session:${sessionId}`);
            void client.join(`tracker-user:${username}`);

            return {
                ok: true,
                joined: {
                    sessionId: sessionId || null,
                    username: username || null,
                },
            };
        } catch {
            return { ok: false };
        }
    }

    // Call this method from tracker services
    broadcastTrackerUpdate(event: string, payload: any) {
        if (this.server) {
            this.server.to('live-tracking').emit(event, payload);
        }
    }
}
