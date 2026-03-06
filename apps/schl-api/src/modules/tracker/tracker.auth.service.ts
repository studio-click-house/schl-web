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
import { Employee } from '@repo/common/models/employee.schema';
import { QcWorkLog } from '@repo/common/models/qc-work-log.schema';
import { UserSession } from '@repo/common/models/user-session.schema';
import { Model } from 'mongoose';
import { LoginTrackerDto } from './dto/auth.dto';
import { TrackerGateway } from './tracker.gateway';

@Injectable()
export class TrackerAuthService {
    constructor(
        @InjectModel(AppUser.name)
        private readonly appUserModel: Model<AppUser>,

        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,

        @InjectModel(UserSession.name)
        private readonly userSessionModel: Model<UserSession>,

        @InjectModel(QcWorkLog.name)
        private readonly qcWorkLogModel: Model<QcWorkLog>,

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

            // Look up employee real name by e_id first
            let displayName = user.username;
            try {
                const employee = await this.employeeModel
                    .findOne({
                        e_id: { $regex: new RegExp(`^${user.username}$`, 'i') },
                    })
                    .select('e_id real_name')
                    .lean()
                    .exec();
                if (employee?.real_name) {
                    displayName = `${user.username} - ${employee.real_name}`;
                }
            } catch {
                /* fallback to username */
            }

            // ── Stale session cleanup ──────────────────────────
            // If the user's previous session ended abruptly (app crash, task manager kill, power loss),
            // logout_at will be null. We close it NOW (using current login time as the logout time for the old session)
            // and mark any stuck 'working' files as 'walkout'.
            try {
                const staleSessions = await this.userSessionModel
                    .find({
                        user_id: user._id,
                        logout_at: null,
                    })
                    .exec();

                for (const stale of staleSessions) {
                    stale.logout_at = now;
                    stale.duration_session = Math.max(
                        0,
                        Math.floor(
                            (now.getTime() - stale.login_at.getTime()) / 1000,
                        ),
                    );
                    await stale.save();
                }

                if (staleSessions.length > 0) {
                    const staleDates = [
                        ...new Set(staleSessions.map(s => s.session_date)),
                    ];

                    const rawName = displayName.split('-')[0]!.trim();
                    const nameRegex = new RegExp(
                        `^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*-.*)?$`,
                        'i',
                    );

                    await this.qcWorkLogModel.updateMany(
                        {
                            employee_name: { $regex: nameRegex },
                            date_today: { $in: staleDates },
                            'files.file_status': 'working',
                        },
                        { $set: { 'files.$[f].file_status': 'walkout' } },
                        { arrayFilters: [{ 'f.file_status': 'working' }] },
                    );
                }
            } catch {
                /* best-effort — don't block login if cleanup fails */
            }

            await this.userSessionModel.create({
                session_id: sessionId,
                user_id: user._id,
                username: displayName,
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
                    username: displayName,
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
                displayName,
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

            // Mark any remaining "working" files as "walkout" for this user+date
            try {
                const rawName = session.username.split('-')[0]!.trim();
                const nameRegex = new RegExp(
                    `^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*-.*)?$`,
                    'i',
                );
                await this.qcWorkLogModel.updateMany(
                    {
                        employee_name: { $regex: nameRegex },
                        date_today: session.session_date,
                        'files.file_status': 'working',
                    },
                    { $set: { 'files.$[f].file_status': 'walkout' } },
                    { arrayFilters: [{ 'f.file_status': 'working' }] },
                );
            } catch {
                /* best-effort — don't block logout response */
            }

            this.trackerGateway.broadcastTrackerUpdate('TRACKER_UPDATED', {
                reason: 'logout',
            });

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
