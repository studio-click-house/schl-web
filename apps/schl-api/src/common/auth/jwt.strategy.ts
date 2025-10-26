import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserSession } from '@repo/schemas/types/user-session.type';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly config: ConfigService) {
        const secret =
            config.get<string>('AUTH_SECRET') || process.env.AUTH_SECRET;

        if (!secret) {
            // Provide a clearer error than passport-jwt's generic message
            throw new Error(
                'JWT secret is not configured. Please set AUTH_SECRET in your environment (.env).',
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: secret,
        });
    }

    validate(payload: any): UserSession {
        // `payload` is what we signed in the JWT token
        // Here, we can extract and return the user information we need
        return {
            db_id: payload.sub, // user ID
            permissions: payload.perms, // array of permission strings
            role_id: payload.role, // role ID
        };
    }
}
// The returned value is attached to the request object as req.user
// We can then access it in your route handlers or guards
