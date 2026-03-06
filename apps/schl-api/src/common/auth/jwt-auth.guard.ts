// auth/jwt-auth.guard.ts
import {
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private reflector: Reflector,
        private readonly config: ConfigService,
    ) {
        super();
    }

    // TRACKER-ONLY: Detect requests for /tracker routes.
    // These routes do not use JWT tokens; they are authenticated via tracker-secret.
    private isTrackerRoute(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const rawUrl: string =
            req?.originalUrl || req?.url || req?.path || req?.baseUrl || '';
        const pathOnly = (rawUrl.split('?')[0] ?? '').toLowerCase();
        return /(^|\/)tracker(\/|$)/.test(pathOnly);
    }

    // TRACKER-ONLY: Validate tracker-secret header against TRACKER_AUTH_SECRET.
    // If secret is missing/wrong, request is rejected before JWT strategy is called.
    private validateTrackerSecret(context: ExecutionContext): boolean {
        const expected = (
            this.config.get<string>('TRACKER_AUTH_SECRET') || ''
        ).trim();

        if (!expected) {
            throw new InternalServerErrorException(
                'Tracker auth secret not configured',
            );
        }

        const req = context.switchToHttp().getRequest();
        const headers = (req?.headers || {}) as Record<string, unknown>;
        const provided = headers['tracker-secret'] as string | undefined;

        const providedTrim = (provided || '').trim();
        if (!providedTrim || providedTrim !== expected) {
            throw new UnauthorizedException('Invalid tracker secret');
        }

        return true;
    }

    canActivate(context: ExecutionContext) {
        // Skip public routes
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) return true;

        // TRACKER-ONLY AUTH FLOW:
        // 1) If route is /tracker, bypass JWT token validation.
        // 2) Allow request only when tracker-secret header is valid.
        if (this.isTrackerRoute(context)) {
            return this.validateTrackerSecret(context);
        }

        // NORMAL AUTH FLOW:
        // Non-tracker routes continue with standard JWT validation via JwtStrategy.

        // DEBUG HEADER LOGGING (remove or disable in production)
        try {
            const req = context.switchToHttp().getRequest();
            if (req) {
                const headers = req.headers || {};
                const authHeader: string | undefined =
                    (headers['authorization'] as string | undefined) ||
                    (headers['Authorization'] as string | undefined);
                let authPreview = 'NONE';
                if (authHeader) {
                    // Show only scheme + first 10 chars of token to avoid leaking secrets
                    const [scheme, token] = authHeader.split(' ');
                    authPreview = `${scheme || 'Unknown'} ${token ? token.slice(0, 10) + '...' : ''}`;
                }
                this.logger.debug(`Auth Header: ${authPreview}`);
            }
        } catch (e) {
            this.logger.warn(`Header logging failed: ${(e as Error).message}`);
        }

        return super.canActivate(context);
    }
}
