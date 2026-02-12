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

            // We want holidays that intersect with the requested range.
            // Intersection logic: holiday.start <= end && holiday.end >= start
            if (start && end) {
                query.$or = [
                    { dateFrom: { $gte: start, $lte: end } },
                    { dateTo: { $gte: start, $lte: end } },
                    { dateFrom: { $lte: start }, dateTo: { $gte: end } },
                ] as any;
            } else if (start) {
                // Holidays that end on/after start
                query.dateTo = { $gte: start } as any;
            } else if (end) {
                // Holidays that start on/before end
                query.dateFrom = { $lte: end } as any;
            }
        }

        if (name) {
            query.name = { $regex: name, $options: 'i' } as any;
        }

        return await this.holidayModel
            .find(query)
            .populate('flag')
            .sort({ dateFrom: 1 })
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

        const from = moment
            .tz(dto.dateFrom, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const to = dto.dateTo
            ? moment.tz(dto.dateTo, 'Asia/Dhaka').endOf('day').toDate()
            : from; // Single-day holiday if dateTo omitted

        // Check for overlapping holidays
        const overlapping = await this.holidayModel.findOne({
            $or: [{ dateFrom: { $lte: to }, dateTo: { $gte: from } }],
        });

        if (overlapping) {
            throw new BadRequestException(
                'A holiday already exists in the specified date range',
            );
        }

        // Always use the Attendance Flag with code 'H' (Holiday)
        const holidayFlag = await this.flagModel
            .findOne({ code: 'H' })
            .lean()
            .exec();
        if (!holidayFlag) {
            throw new BadRequestException(
                "Attendance Flag with code 'H' (Holiday) not found. Please create it before adding holidays.",
            );
        }
        const flagId = holidayFlag._id.toString();

        return await this.holidayModel.create({
            name: dto.name,
            dateFrom: from,
            dateTo: to,
            comment: dto.comment?.trim(),
            flag: flagId,
        });
    }

    async update(id: string, dto: UpdateHolidayDto, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        const from = moment
            .tz(dto.dateFrom, 'Asia/Dhaka')
            .startOf('day')
            .toDate();
        const to = dto.dateTo
            ? moment.tz(dto.dateTo, 'Asia/Dhaka').endOf('day').toDate()
            : from;

        const patch: Partial<Holiday> = {
            name: dto.name,
            dateFrom: from,
            dateTo: to,
            comment: dto.comment?.trim(),
        } as Partial<Holiday>;

        // Check for overlapping other holidays
        const overlapping = await this.holidayModel.findOne({
            _id: { $ne: id },
            $or: [{ dateFrom: { $lte: to }, dateTo: { $gte: from } }],
        });
        if (overlapping) {
            throw new BadRequestException(
                'Another holiday exists in the specified date range',
            );
        }

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
