import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserSession } from '@repo/common/types/user-session.type';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(private readonly config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            passReqToCallback: true,
            secretOrKeyProvider: (
                request: Request,
                rawJwtToken: any,
                done: (err: any, secret?: string | Buffer) => void,
            ) => {
                const origin = request.headers.origin || request.headers.host;
                // this.logger.debug(`[Auth] Request origin: ${origin}`);

                let secret: string | undefined;
                let secretSource: string;

                const portalUrl = this.config.get<string>('PORTAL_URL');
                const crmUrl = this.config.get<string>('CRM_URL');

                // this.logger.debug(
                //     `[Auth] Configured URLs - PORTAL_URL: ${portalUrl}, CRM_URL: ${crmUrl}`,
                // );

                if (portalUrl && origin?.includes(portalUrl)) {
                    secret = this.config.get<string>('PORTAL_AUTH_SECRET');
                    secretSource = 'PORTAL_AUTH_SECRET';
                } else if (crmUrl && origin?.includes(crmUrl)) {
                    secret = this.config.get<string>('CRM_AUTH_SECRET');
                    secretSource = 'CRM_AUTH_SECRET';
                } else {
                    secret = this.config.get<string>('AUTH_SECRET');
                    secretSource = 'AUTH_SECRET (fallback)';
                }

                if (!secret) {
                    this.logger.error(
                        `[Auth] JWT secret not found for origin: ${origin}. Tried source: ${secretSource}`,
                    );
                    return done(
                        new UnauthorizedException(
                            'Could not find secret for origin.',
                        ),
                        undefined,
                    );
                }

                // this.logger.debug(`[Auth] Using secret from: ${secretSource}`);
                return done(null, secret);
            },
        });
    }

    validate(request: Request, payload: any): UserSession {
        // this.logger.debug(
        //     `[Auth] Decoded JWT payload: ${JSON.stringify(payload)}`,
        // );
        // `payload` is what we signed in the JWT token
        // Here, we can extract and return the user information we need
        return {
            real_name: payload.name, // user's real name
            db_id: payload.sub, // user ID
            permissions: payload.perms, // array of permission strings
            role_id: payload.role, // role ID
            e_id: payload.e_id, // employee ID
            department: payload.dept, // employee's department
        };
    }
}
// The returned value is attached to the request object as req.user
// We can then access it in your route handlers or guards
