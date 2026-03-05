import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/tracker', cors: { origin: '*' } })
export class TrackerGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly allowedLiveTrackingRoles = new Set([
        'admin',
        'superadmin',
        'super admin',
        'qcmanager',
    ]);

    constructor() {}

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
    handleSubscribe(
        client: Socket,
        payload: { sessionId?: string; username?: string; role?: string },
    ) {
        try {
            const startedAt = Date.now();
            const username =
                typeof payload?.username === 'string'
                    ? payload.username.trim().toLowerCase()
                    : '';
            const role =
                typeof payload?.role === 'string'
                    ? payload.role.trim().toLowerCase()
                    : '';

            if (!username) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Missing username',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Missing username' };
            }

            if (!this.allowedLiveTrackingRoles.has(role)) {
                client.emit('TRACKER_SUBSCRIBE_DENIED', {
                    reason: 'Role not allowed',
                });
                client.disconnect(true);
                return { ok: false, reason: 'Role not allowed' };
            }

            void client.join('live-tracking');
            void client.join(`tracker-user:${username}`);

            console.log(
                `SUBSCRIBE_LIVE_TRACKING ok (client=${client.id}) in ${
                    Date.now() - startedAt
                }ms`,
            );

            return {
                ok: true,
                joined: {
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
