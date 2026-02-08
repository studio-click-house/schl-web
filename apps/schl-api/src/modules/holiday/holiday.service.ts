import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Holiday, HolidayDocument } from '@repo/common/models/holiday.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { Model } from 'mongoose';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/create-holiday.dto';

@Injectable()
export class HolidayService {
    constructor(
        @InjectModel(Holiday.name)
        private holidayModel: Model<HolidayDocument>,
    ) {}

    async findAll(year?: number) {
        const query: any = {};
        if (year) {
            const start = moment().year(year).startOf('year').toDate();
            const end = moment().year(year).endOf('year').toDate();
            query.date = { $gte: start, $lte: end };
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

        return await this.holidayModel.create({
            ...dto,
            date: date,
            flag: dto.flagId,
        });
    }

    async update(id: string, dto: UpdateHolidayDto, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }

        const date = moment.tz(dto.date, 'Asia/Dhaka').startOf('day').toDate();
        return await this.holidayModel.findByIdAndUpdate(
            id,
            {
                ...dto,
                date: date,
                flag: dto.flagId,
            },
            { new: true },
        );
    }

    async delete(id: string, userSession: UserSession) {
        if (!hasPerm('settings:the_super_admin', userSession.permissions)) {
            throw new ForbiddenException('Permission denied');
        }
        return await this.holidayModel.findByIdAndDelete(id);
    }
}
