import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    AttendanceFlag,
    AttendanceFlagDocument,
} from '@repo/common/models/attendance-flag.schema';
import { Holiday, HolidayDocument } from '@repo/common/models/holiday.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { FilterQuery, Model } from 'mongoose';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/create-holiday.dto';

@Injectable()
export class HolidayService {
    constructor(
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
        @InjectModel(AttendanceFlag.name)
        private flagModel: Model<AttendanceFlagDocument>,
    ) {}

    async findAll(fromDate?: string, toDate?: string, name?: string) {
        const query: FilterQuery<HolidayDocument> = {};

        if (fromDate || toDate) {
            const start = fromDate
                ? moment
                      .tz(fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .startOf('day')
                      .toDate()
                : undefined;
            const end = toDate
                ? moment
                      .tz(toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                      .endOf('day')
                      .toDate()
                : undefined;
            if (start && end) query.date = { $gte: start, $lte: end };
            else if (start) query.date = { $gte: start };
            else if (end) query.date = { $lte: end };
        }

        if (name) {
            query.name = { $regex: name, $options: 'i' } as any;
        }

        return await this.holidayModel
            .find(query)
            .populate('flag')
            .sort({ date: 1 })
            .exec();
    }

    async create(dto: CreateHolidayDto, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            // Assuming a permission exists, strictly speaking we should check
            // For now let's reuse a generic admin perm or assume admin check was done
            if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
                throw new ForbiddenException('Permission denied');
            }
        }

        const date = moment.tz(dto.date, 'Asia/Dhaka').startOf('day').toDate();
        const existing = await this.holidayModel.findOne({ date: date });

        // We might allow multiple holidays on same day? Probably not.
        if (existing) {
            throw new BadRequestException(
                'A holiday already exists on this date',
            );
        }

        // Determine flag: prefer provided flagId, else pick the flag with code 'H'
        let flagId = dto.flagId;
        if (!flagId) {
            const holidayFlag = await this.flagModel
                .findOne({ code: 'H' })
                .lean()
                .exec();
            if (!holidayFlag) {
                throw new BadRequestException(
                    "Attendance Flag with code 'H' (Holiday) not found. Please create it before adding holidays.",
                );
            }
            flagId = holidayFlag._id.toString();
        }

        return await this.holidayModel.create({
            ...dto,
            date: date,
            flag: flagId,
        });
    }

    async update(id: string, dto: UpdateHolidayDto, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        const date = moment.tz(dto.date, 'Asia/Dhaka').startOf('day').toDate();

        const patch: Partial<Holiday> = {
            ...dto,
            date: date,
        } as Partial<Holiday>;

        // Only update flag if provided (we removed flag selection from UI)
        if (dto.flagId) patch.flag = dto.flagId as any;

        return await this.holidayModel.findByIdAndUpdate(id, patch, {
            new: true,
        });
    }

    async delete(id: string, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }
        return await this.holidayModel.findByIdAndDelete(id);
    }
}
