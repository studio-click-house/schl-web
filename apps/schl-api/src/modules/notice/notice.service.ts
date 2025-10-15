import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSession } from 'src/common/types/user-session.type';
import { applyDateRange } from 'src/common/utils/date-helpers';
import {
    addIfDefined,
    createRegexQuery,
} from 'src/common/utils/filter-helpers';
import { hasPerm } from 'src/common/utils/permission-check';
import { Notice } from 'src/models/notice.schema';
import { CreateNoticeBodyDto } from './dto/create-notice.dto';
import {
    SearchNoticesBodyDto,
    SearchNoticesQueryDto,
} from './dto/search-notices.dto';
import { NoticeFactory } from './factories/notice.factory';

@Injectable()
export class NoticeService {
    constructor(
        @InjectModel(Notice.name)
        private readonly noticeModel: Model<Notice>,
    ) {}

    async createNotice(
        noticeData: CreateNoticeBodyDto,
        userSession: UserSession,
    ) {
        // Permission checks per channel
        if (
            noticeData.channel === 'production' &&
            !hasPerm('notice:send_notice_production', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to send notices to production channel",
            );
        }
        if (
            noticeData.channel === 'marketers' &&
            !hasPerm('notice:send_notice_marketers', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to send notices to marketers channel",
            );
        }

        try {
            // prevent duplicate notice number
            const exists = await this.noticeModel.countDocuments({
                notice_no: createRegexQuery(noticeData.notice_no, {
                    exact: true,
                }),
            });
            if (exists > 0) {
                throw new ConflictException(
                    'Notice with the same notice number already exists',
                );
            }

            const doc = NoticeFactory.fromCreateDto(noticeData);
            const created = await this.noticeModel.create(doc);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create notice',
                );
            }
            return created;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to create notice');
        }
    }

    async getNotice(reportId: string, userSession: UserSession) {
        if (!hasPerm('notice:view_notice', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view this notice",
            );
        }
        try {
            const notice = await this.noticeModel.findById(reportId).exec();
            if (!notice) {
                throw new NotFoundException('Notice not found');
            }
            return notice;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to retrieve notice');
        }
    }

    async searchNotices(
        filters: SearchNoticesBodyDto,
        pagination: SearchNoticesQueryDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('notice:view_notice', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view notices",
            );
        }

        const { page, itemsPerPage, filtered, paginated } = pagination;
        const { channel, title, noticeNo, fromDate, toDate } = filters;

        type QueryShape = {
            channel?: ReturnType<typeof createRegexQuery>;
            title?: ReturnType<typeof createRegexQuery>;
            notice_no?: ReturnType<typeof createRegexQuery>;
            createdAt?: { $gte?: Date; $lte?: Date };
        };

        const query: QueryShape = {};

        // Date range over createdAt
        applyDateRange(query, 'createdAt', fromDate, toDate);

        // Regex fields: channel (exact), notice_no (exact), title (fuzzy)
        addIfDefined(
            query,
            'channel',
            createRegexQuery(channel, { exact: true }),
        );
        addIfDefined(
            query,
            'notice_no',
            createRegexQuery(noticeNo, { exact: true }),
        );
        addIfDefined(query, 'title', createRegexQuery(title));

        const searchQuery: QueryShape = { ...query };

        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        if (
            filtered &&
            !channel &&
            !title &&
            !noticeNo &&
            !fromDate &&
            !toDate
        ) {
            throw new BadRequestException('No filter applied');
        }

        const skip = (page - 1) * itemsPerPage;

        if (paginated) {
            const count = await this.noticeModel.countDocuments(
                searchQuery as Record<string, unknown>,
            );

            const items = await this.noticeModel
                .aggregate([
                    { $match: searchQuery },
                    { $sort: sortQuery },
                    { $skip: skip },
                    { $limit: itemsPerPage },
                ])
                .exec();

            if (!items) {
                throw new InternalServerErrorException(
                    'Unable to retrieve notices',
                );
            }

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        }

        // Unpaginated: simple find
        const items = await this.noticeModel
            .find(searchQuery as Record<string, unknown>)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        if (!items) {
            throw new InternalServerErrorException(
                'Unable to retrieve notices',
            );
        }
        return items;
    }

    async updateNotice(
        noticeId: string,
        noticeData: Partial<CreateNoticeBodyDto>,
        userSession: UserSession,
    ) {
        // If channel is being changed/updated, ensure user has permission for that channel
        if (
            noticeData.channel === 'production' &&
            !hasPerm('notice:send_notice_production', userSession.permissions)
        ) {
            throw new ForbiddenException(
                'You do not have permission to update notices for production channel',
            );
        }
        if (
            noticeData.channel === 'marketers' &&
            !hasPerm('notice:send_notice_marketers', userSession.permissions)
        ) {
            throw new ForbiddenException(
                'You do not have permission to update notices for marketers channel',
            );
        }

        try {
            const patch = NoticeFactory.fromUpdateDto(noticeData);
            if (Object.keys(patch).length === 0) {
                throw new BadRequestException('No update fields provided');
            }

            const updated = await this.noticeModel
                .findByIdAndUpdate(noticeId, patch, { new: true })
                .exec();

            if (!updated) {
                throw new NotFoundException('Notice not found');
            }

            return { message: 'Updated the notice data successfully' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update notice');
        }
    }
    async deleteNotice(noticeId: string, userSession: UserSession) {
        const noticeDoc = await this.noticeModel.findById(noticeId).exec();
        if (!noticeDoc) {
            throw new NotFoundException('Notice not found');
        }
        if (
            noticeDoc.channel === 'production' &&
            !hasPerm('notice:send_notice_production', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to delete production notices",
            );
        }
        if (
            noticeDoc.channel === 'marketers' &&
            !hasPerm('notice:send_notice_marketers', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to delete marketers notices",
            );
        }

        try {
            await noticeDoc.deleteOne();
            return 'Notice deleted successfully';
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to delete notice');
        }
    }
}
