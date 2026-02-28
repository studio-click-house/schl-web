import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { AppUser } from '@repo/common/models/app-user.schema';
import { UserSession } from '@repo/common/models/user-session.schema';
import { Model } from 'mongoose';
import { LoginTrackerDto } from './dto/auth.dto';
import { TrackerGateway } from './tracker.gateway';

@Injectable()
export class TrackerAuthService {
    constructor(
        @InjectModel(AppUser.name)
        private readonly appUserModel: Model<AppUser>,

        @InjectModel(UserSession.name)
        private readonly userSessionModel: Model<UserSession>,

        private readonly trackerGateway: TrackerGateway,
    ) {}

    async checkUser(username: string) {
        try {
            const user = await this.appUserModel
                .findOne({ username })
                .lean()
                .exec();

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return {
                exists: true,
                username: user.username,
                passwordRequired: user.is_password_set,
                role: (user.role ?? 'employee').toLowerCase(),
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to check user');
        }
    }

    async login(dto: LoginTrackerDto) {
        try {
            const user = await this.appUserModel
                .findOne({ username: dto.username })
                .lean()
                .exec();

            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }

            if (!user.is_password_set) {
                return {
                    valid: false,
                    passwordSetupRequired: true,
                    username: user.username,
                };
            }

            if (user.password !== dto.password) {
                throw new UnauthorizedException('Invalid credentials');
            }

            const sessionId = randomUUID();
            const now = new Date();
            const sessionDate = now.toISOString().split('T')[0] as string;

            await this.userSessionModel.create({
                session_id: sessionId,
                user_id: user._id,
                username: user.username,
                user_type: (user.role ?? 'employee').toLowerCase(),
                session_date: sessionDate,
                login_at: now,
                logout_at: null,
                duration_session: null,
            });

            this.trackerGateway.broadcastTrackerUpdate(
                'TRACKER_SESSION_UPDATED',
                {
                    sessionId,
                    username: user.username,
                    userType: (user.role ?? 'employee').toLowerCase(),
                    sessionDate,
                    loginAt: now.toISOString(),
                    logoutAt: null,
                    durationSeconds: null,
                    timestamp: new Date().toISOString(),
                },
            );

            return {
                valid: true,
                role: (user.role ?? 'employee').toLowerCase(),
                username: user.username,
                user_id: String(user._id),
                sessionId,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to login');
        }
    }

    async logout(sessionId: string) {
        try {
            const now = new Date();

            const session = await this.userSessionModel
                .findOne({ session_id: sessionId })
                .exec();

            if (!session) {
                throw new UnauthorizedException('Session not found');
            }

            if (session.logout_at) {
                return {
                    success: true,
                    alreadyLoggedOut: true,
                };
            }

            session.logout_at = now;
            session.duration_session = Math.max(
                0,
                Math.floor((now.getTime() - session.login_at.getTime()) / 1000),
            );

            await session.save();

            this.trackerGateway.broadcastTrackerUpdate(
                'TRACKER_SESSION_UPDATED',
                {
                    sessionId: session.session_id,
                    username: session.username,
                    userType: session.user_type,
                    sessionDate: session.session_date,
                    loginAt: session.login_at.toISOString(),
                    logoutAt: session.logout_at
                        ? session.logout_at.toISOString()
                        : null,
                    durationSeconds: session.duration_session ?? null,
                    timestamp: new Date().toISOString(),
                },
            );

            return {
                success: true,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to logout');
        }
    }

    async setPassword(username: string, password: string) {
        try {
            const user = await this.appUserModel.findOne({ username }).exec();

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (user.is_password_set) {
                throw new BadRequestException('Password already set');
            }

            user.password = password;
            user.is_password_set = true;
            await user.save();

            return {
                success: true,
                message: 'Password set successfully',
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to set password');
        }
    }
}
