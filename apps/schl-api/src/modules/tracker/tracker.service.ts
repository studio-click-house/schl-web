import {
    BadRequestException,
    Injectable,
    OnModuleInit,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrackerUser } from '@repo/common/models/tracker-user.schema';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { Order } from '@repo/common/models/order.schema';
import { LoginTrackerDto } from './dto/login-tracker.dto';
import { SyncWorkLogDto } from './dto/sync-work-log.dto';

@Injectable()
export class TrackerService implements OnModuleInit {
    constructor(
        @InjectModel(TrackerUser.name)
        private readonly trackerUserModel: Model<TrackerUser>,
        @InjectModel(WorkLog.name)
        private readonly workLogModel: Model<WorkLog>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
    ) { }

    async onModuleInit() {
        console.log('👷 Running One-Time Index Cleanup...');
        const indexesToDrop = [
            'employeeName_1', 'clientName_1', 'workType_1', 'date_1',
            'employee_name_1', 'client_code_1', 'work_type_1', 'date_today_1', 'shift_1'
        ];

        for (const indexName of indexesToDrop) {
            try {
                await this.workLogModel.collection.dropIndex(indexName);
                console.log(`✅ Dropped index: ${indexName}`);
            } catch (e) {
                // Ignore errors if index doesn't exist
                // console.log(`⏩ Skipping index (not found): ${indexName}`);
            }
        }
        console.log('✨ Index Cleanup Complete.');
    }

    async login(dto: LoginTrackerDto) {
        const user = await this.trackerUserModel
            .findOne({ username: dto.username })
            .lean()
            .exec();

        if (!user) throw new UnauthorizedException('Invalid credentials');

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
    }

    async setPassword(username: string, password: string) {
        const user = await this.trackerUserModel
            .findOne({ username })
            .exec();

        if (!user) throw new UnauthorizedException('User not found');

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
    }

    async checkUser(username: string) {
        const user = await this.trackerUserModel
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
    }

    async sync(payload: SyncWorkLogDto) {
        if (!payload.employee_name || !payload.file_name) {
            throw new BadRequestException('Missing required fields');
        }

        const dateString = payload.completed_at
            ? new Date(payload.completed_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        const filter = {
            employee_name: payload.employee_name.toLowerCase(),
            client_code: (payload.client_code || 'unknown_client').toLowerCase(),
            shift: (payload.shift || 'unknown_shift').toLowerCase(),
            work_type: (payload.work_type || 'employee').toLowerCase(),
            date_today: dateString,
        };

        // 1. Ensure the Daily Bucket exists
        await this.workLogModel.updateOne(
            filter,
            { $setOnInsert: filter },
            { upsert: true }
        );

        const isFinishedStatus = ['done', 'walk_out'].includes(payload.file_status);

        // 2. ATOMIC UPDATE: Try to update the file if it exists
        // Guard: Don't let pulses (working/paused) overwrite a 'done' status
        const updateFilter = {
            ...filter,
            'files.file_name': payload.file_name,
        };

        if (!isFinishedStatus) {
            (updateFilter as any)['files.file_status'] = { $nin: ['done', 'walk_out'] };
        }

        const updateData: any = { $set: {} };
        if (payload.file_status) updateData.$set['files.$.file_status'] = payload.file_status;
        if (payload.folder_path) updateData.$set['files.$.folder_path'] = payload.folder_path; // Fix: Overwrite path on update
        if (payload.time_spent !== undefined) updateData.$set['files.$.time_spent'] = payload.time_spent;
        if (payload.pause_count !== undefined) updateData.$set['files.$.pause_count'] = payload.pause_count;
        if (payload.pause_time !== undefined) updateData.$set['files.$.pause_time'] = payload.pause_time;
        if (payload.categories) updateData.$set['files.$.categories'] = payload.categories;
        if (payload.completed_at) updateData.$set['files.$.completed_at'] = new Date(payload.completed_at);
        if (payload.started_at) updateData.$set['files.$.started_at'] = new Date(payload.started_at);

        // console.log('DEBUG: Sync Update Filter:', JSON.stringify(updateFilter));
        // console.log('DEBUG: Sync Update Data:', JSON.stringify(updateData));

        const updateResult = await this.workLogModel.updateOne(updateFilter, updateData);


        // 3. ATOMIC ADD: If update didn't happen, it might be a new file
        // We only push if the file name NEVER existed in this bucket
        if (updateResult.matchedCount === 0) {
            const pushFilter = {
                ...filter,
                'files.file_name': { $ne: payload.file_name }
            };

            const newFile = {
                folder_path: payload.folder_path || 'Unknown_Path',
                file_name: payload.file_name,
                file_status: payload.file_status,
                time_spent: payload.time_spent || 0,
                pause_count: payload.pause_count || 0,
                pause_time: payload.pause_time || 0,
                categories: payload.categories || [],
                started_at: payload.started_at ? new Date(payload.started_at) : new Date(),
                completed_at: payload.completed_at ? new Date(payload.completed_at) : undefined,
            };

            await this.workLogModel.updateOne(
                pushFilter,
                { $push: { files: newFile } }
            );
        }

        return { success: true };


    }




    async resolveOrder(folderPath: string) {
        if (!folderPath) return { found: false };

        // 1. Try exact match
        let order = await this.orderModel.findOne({
            folder_path: folderPath
        }).select('task client_code').lean().exec();

        // 2. Try slash-agnostic & case-insensitive match
        // logic: escape special chars, then replace any slash logic with [\\\/]
        if (!order) {
            const escapedPath = folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Allow both / and \ for path separators
            const slashAgnosticPattern = escapedPath.replace(/(\\\/|\\\\)/g, '[\\\\\\/]');

            order = await this.orderModel.findOne({
                folder_path: { $regex: new RegExp(`^${slashAgnosticPattern}$`, 'i') }
            }).select('task client_code').lean().exec();
        }

        if (order) {
            return {
                found: true,
                task: order.task,
                client: order.client_code
            };
        }

        return { found: false };
    }
}
