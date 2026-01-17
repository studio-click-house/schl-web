import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AppUser } from '@repo/common/models/app-user.schema';
import { Order } from '@repo/common/models/order.schema';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { Model } from 'mongoose';
import { LoginTrackerDto } from './dto/login-tracker.dto';
import { SyncWorkLogDto } from './dto/sync-work-log.dto';
import { TrackerFactory } from './factories/tracker.factory';

@Injectable()
export class TrackerService {
    constructor(
        @InjectModel(AppUser.name)
        private readonly appUserModel: Model<AppUser>,
        @InjectModel(WorkLog.name)
        private readonly workLogModel: Model<WorkLog>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
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
                passwordRequired: user.isPasswordSet,
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

            // Check if password setup is required
            if (!user.isPasswordSet) {
                return {
                    valid: false,
                    passwordSetupRequired: true,
                    username: user.username,
                };
            }

            // Normal login - check password
            if (user.password !== dto.password) {
                throw new UnauthorizedException('Invalid credentials');
            }

            return {
                valid: true,
                role: (user.role ?? 'employee').toLowerCase(),
                username: user.username,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to login');
        }
    }

    async setPassword(username: string, password: string) {
        try {
            const user = await this.appUserModel.findOne({ username }).exec();

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (user.isPasswordSet) {
                throw new BadRequestException('Password already set');
            }

            user.password = password;
            user.isPasswordSet = true;
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

    async sync(payload: SyncWorkLogDto) {
        if (!payload.employeeName || !payload.fileName) {
            throw new BadRequestException('Missing required fields');
        }

        try {
            const dateString = payload.completedAt
                ? new Date(payload.completedAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            const filter = {
                employeeName: payload.employeeName.toLowerCase(),
                clientCode: (
                    payload.clientCode || 'unknown_client'
                ).toLowerCase(),
                shift: (payload.shift || 'unknown_shift').toLowerCase(),
                workType: (payload.workType || 'employee').toLowerCase(),
                dateToday: dateString,
            };

            // 1. Ensure the Daily Bucket exists
            await this.workLogModel.updateOne(
                filter,
                { $setOnInsert: filter },
                { upsert: true },
            );

            const isFinishedStatus = ['done', 'walk_out'].includes(
                payload.fileStatus,
            );

            // 2. ATOMIC UPDATE: Try to update the file if it exists
            // Guard: Don't let pulses (working/paused) overwrite a 'done' status
            const updateFilter: Record<string, any> = {
                ...filter,
                'files.fileName': payload.fileName,
            };
            if (!isFinishedStatus) {
                updateFilter['files.fileStatus'] = {
                    $nin: ['done', 'walk_out'],
                };
            }

            const patch = TrackerFactory.fromSyncUpdateDto(payload);
            const $set: Record<string, any> = {};
            for (const [key, value] of Object.entries(patch)) {
                $set[`files.$.${key}`] = value;
            }

            const updateResult = await this.workLogModel.updateOne(
                updateFilter,
                { $set },
            );

            // 3. ATOMIC ADD: If update didn't happen, it might be a new file
            // We only push if the file name NEVER existed in this bucket
            if (updateResult.matchedCount === 0) {
                const pushFilter = {
                    ...filter,
                    'files.fileName': { $ne: payload.fileName },
                };
                const newFile = TrackerFactory.fromSyncDto(payload);

                await this.workLogModel.updateOne(pushFilter, {
                    $push: { files: newFile },
                });
            }

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to sync work log');
        }
    }

    async resolveOrder(folderPath: string) {
        if (!folderPath) {
            return { found: false };
        }

        try {
            // 1. Try exact match
            let order = await this.orderModel
                .findOne({ folder_path: folderPath })
                .select('task client_code')
                .lean()
                .exec();

            // 2. Try slash-agnostic & case-insensitive match
            if (!order) {
                const escapedPath = folderPath.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&',
                );
                const slashAgnosticPattern = escapedPath.replace(
                    /(\\\/|\\\\)/g,
                    '[\\\\\\/]',
                );

                order = await this.orderModel
                    .findOne({
                        folder_path: {
                            $regex: new RegExp(
                                `^${slashAgnosticPattern}$`,
                                'i',
                            ),
                        },
                    })
                    .select('task client_code')
                    .lean()
                    .exec();
            }

            if (order) {
                return {
                    found: true,
                    task: order.task,
                    client: order.client_code,
                };
            }

            return { found: false };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to resolve order');
        }
    }
}
