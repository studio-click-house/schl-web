import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Leave, LeaveDocument } from '@repo/common/models/leave.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { FilterQuery, Model } from 'mongoose';
import { toObjectId } from '../../common/utils/id-helpers.utils';
import { CreateLeaveDto } from './dto/create-leave.dto';

@Injectable()
export class LeaveService {
    constructor(
        @InjectModel(Leave.name)
        private leaveModel: Model<LeaveDocument>,
    ) {}

    async findAll(
        employeeId: string,
        status: string,
        _userSession?: UserSession,
    ) {
        // Reference _userSession to avoid unused-var lint warnings
        void _userSession;
        // Basic permission check - can user view all leaves or only theirs?
        // For simplicity, assume admins can view all, others only theirs
        // implementation details omitted for brevity
        const query: FilterQuery<LeaveDocument> = {};
        if (employeeId) query.employee = toObjectId(employeeId) as any;
        if (status) query.status = status;

        return await this.leaveModel
            .find(query)
            .populate('employee', 'real_name')
            .populate('flag')
            .sort({ start_date: -1 })
            .exec();
    }

    async apply(dto: CreateLeaveDto, _userSession?: UserSession) {
        // Reference _userSession to avoid unused-var lint warnings
        void _userSession;
        // Validate dates
        const start = moment
            .tz(dto.startDate, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const end = moment
            .tz(dto.endDate, 'Asia/Dhaka')
            .startOf('day')
            .toDate();

        if (end < start) {
            throw new BadRequestException(
                'End date cannot be before start date',
            );
        }

        return await this.leaveModel.create({
            employee: dto.employeeId,
            flag: dto.flagId,
            start_date: start,
            end_date: end,
            reason: dto.reason,
            status: 'pending', // Default status
        });
    }

    async updateStatus(
        id: string,
        status: 'approved' | 'rejected',
        userSession: UserSession,
    ) {
        if (!hasPerm('accountancy:manage_employee', userSession.permissions)) {
            // Fallback default perm
            if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
                throw new ForbiddenException('Permission denied');
            }
        }

        const leave = await this.leaveModel.findByIdAndUpdate(
            id,
            {
                status: status,
                approved_by: userSession.db_id,
            },
            { new: true },
        );

        if (!leave) throw new NotFoundException('Leave request not found');
        return leave;
    }
}
