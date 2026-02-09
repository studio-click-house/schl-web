import {
    BadRequestException,
    ForbiddenException,
    Injectable,
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
        const SYSTEM_CODES = ['P', 'A', 'L', 'H', 'W', 'E', 'D'];
        if (flag && SYSTEM_CODES.includes(flag.code)) {
            throw new BadRequestException('Cannot delete system flags');
        }

        return await this.attendanceFlagModel.findByIdAndDelete(id);
    }
}
