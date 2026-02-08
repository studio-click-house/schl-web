import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    AttendanceFlag,
    AttendanceFlagDocument,
} from '@repo/common/models/attendance-flag.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Model } from 'mongoose';
import {
    CreateAttendanceFlagDto,
    UpdateAttendanceFlagDto,
} from './dto/create-attendance-flag.dto';

@Injectable()
export class AttendanceFlagService {
    constructor(
        @InjectModel(AttendanceFlag.name)
        private attendanceFlagModel: Model<AttendanceFlagDocument>,
    ) {}

    async findAll() {
        return await this.attendanceFlagModel.find().lean().exec();
    }

    async findOne(id: string) {
        const flag = await this.attendanceFlagModel.findById(id).lean().exec();
        if (!flag) throw new NotFoundException('Flag not found');
        return flag;
    }

    async create(dto: CreateAttendanceFlagDto, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        const existing = await this.attendanceFlagModel.findOne({
            code: dto.code,
        });
        if (existing)
            throw new BadRequestException(
                `Flag with code ${dto.code} already exists`,
            );

        return await this.attendanceFlagModel.create({
            ...dto,
            code: dto.code.toUpperCase(),
        });
    }

    async update(
        id: string,
        dto: UpdateAttendanceFlagDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        return await this.attendanceFlagModel.findByIdAndUpdate(id, dto, {
            new: true,
        });
    }

    async delete(id: string, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        const flag = await this.attendanceFlagModel.findById(id);
        if (flag?.type === 'system') {
            throw new BadRequestException('Cannot delete system flags');
        }

        return await this.attendanceFlagModel.findByIdAndDelete(id);
    }

    async seedDefaults(userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        // We can define defaults here or import from constants
        const defaults = [
            {
                code: 'P',
                name: 'Present',
                description: 'Employee present for work',
                color: '#10B981',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: false,
            },
            {
                code: 'A',
                name: 'Absent',
                description: 'Auto-assigned when absent (0 work hours)',
                color: '#EF4444',
                type: 'system',
                is_payable: false,
                deduction_percent: 100,
                ignore_attendance_hours: true,
            },
            {
                code: 'L',
                name: 'Leave',
                description:
                    'Approved leave (0 work hours, Shift times recorded)',
                color: '#3B82F6',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: true,
            },
            {
                code: 'H',
                name: 'Holiday',
                description:
                    'Public/Org Holiday (0 work hours, Shift times recorded)',
                color: '#8B5CF6',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: true,
            },
            {
                code: 'W',
                name: 'Weekend',
                description: 'Weekly Off (Department specific, 0 work hours)',
                color: '#F59E0B',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: true,
            },
            {
                code: 'E',
                name: 'Early Leave',
                description: 'Leaving before end of shift',
                color: '#F97316',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: false,
            },
            {
                code: 'D',
                name: 'Delay',
                description: 'Arriving after start of shift',
                color: '#EAB308',
                type: 'system',
                is_payable: true,
                ignore_attendance_hours: false,
            },
        ];

        let createdCount = 0;
        for (const def of defaults) {
            const exists = await this.attendanceFlagModel.findOne({
                code: def.code,
            });
            if (!exists) {
                await this.attendanceFlagModel.create(def);
                createdCount++;
            }
        }

        return { message: `Seeded ${createdCount} flags` };
    }
}
