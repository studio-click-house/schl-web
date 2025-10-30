import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Schedule } from '@repo/common/models/schedule.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    addIfDefined,
    addPlusSeparatedContainsAllField,
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { FilterQuery, Model } from 'mongoose';
import { CreateScheduleBodyDto } from './dto/create-schedule.dto';
import { SearchSchedulesBodyDto } from './dto/search-schedules.dto';
import { ScheduleFactory } from './factories/schedule.factory';

type QueryShape = FilterQuery<Schedule>;

@Injectable()
export class ScheduleService {
    constructor(
        @InjectModel(Schedule.name) private scheduleModel: Model<Schedule>,
        private readonly config: ConfigService,
    ) {}

    async searchSchedules(
        filters: SearchSchedulesBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            filtered: boolean;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        // Basic permission guard (either can view or manage schedules)
        if (
            !hasPerm('schedule:view_page', userSession.permissions) &&
            !hasPerm('schedule:manage_schedule', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to view schedules",
            );
        }
        const { page, itemsPerPage, filtered, paginated } = pagination;
        const {
            clientCode,
            task,
            receiveFromDate,
            receiveToDate,
            deliveryFromDate,
            deliveryToDate,
            generalSearchString,
        } = filters;

        // // Build base query (string date ranges + regex fields)
        // interface RangeQuery {
        //     $gte?: string;
        //     $lte?: string;
        // }
        // interface RegexQuery {
        //     $regex: string;
        //     $options: string;
        // }
        // interface QueryShape {
        //     receive_date?: RangeQuery;
        //     delivery_date?: RangeQuery;
        //     client_code?: RegexQuery;
        //     task?: RegexQuery;
        //     $or?: Record<string, RegexQuery>[];
        // }

        const query: QueryShape = {};

        // Receive date range
        if (receiveFromDate || receiveToDate) {
            query.receive_date = {
                ...(receiveFromDate && { $gte: receiveFromDate }),
                ...(receiveToDate && { $lte: receiveToDate }),
            };
            if (!query.receive_date.$gte && !query.receive_date.$lte) {
                delete query.receive_date; // safety cleanup
            }
        }

        // Delivery date range
        if (deliveryFromDate || deliveryToDate) {
            query.delivery_date = {
                ...(deliveryFromDate && { $gte: deliveryFromDate }),
                ...(deliveryToDate && { $lte: deliveryToDate }),
            };
            if (!query.delivery_date.$gte && !query.delivery_date.$lte) {
                delete query.delivery_date;
            }
        }

        // Regex-able individual fields
        addIfDefined(query, 'client_code', createRegexQuery(clientCode));
        if (task && task.includes('+')) {
            addPlusSeparatedContainsAllField(query, 'task', task);
        } else {
            addIfDefined(query, 'task', createRegexQuery(task));
        }

        // Clone for search extension
        const searchQuery: QueryShape = { ...query };

        if (
            filtered &&
            Object.keys(query).length === 0 &&
            !generalSearchString
        ) {
            throw new BadRequestException('No filter applied');
        }

        // General search across multiple fields
        if (generalSearchString) {
            searchQuery.$or = buildOrRegex(generalSearchString, [
                'client_code',
                'client_name',
                'task',
            ]);
        }

        const skip = (page - 1) * itemsPerPage;

        // Count first (used for pagination metadata). Even if not paginated, keep consistent.
        const count = await this.scheduleModel.countDocuments(
            searchQuery as Record<string, unknown>,
        );

        try {
            let items: Schedule[];
            if (paginated) {
                const pipeline: any[] = [
                    { $match: searchQuery },
                    { $sort: { receive_date: -1 } },
                    { $skip: skip },
                    { $limit: itemsPerPage },
                ];
                items = await this.scheduleModel.aggregate(pipeline).exec();
            } else {
                items = await this.scheduleModel
                    .find(searchQuery as Record<string, unknown>)
                    .sort({ receive_date: 1 })
                    .lean()
                    .exec();
            }

            if (!items) {
                throw new BadRequestException('Unable to retrieve schedules');
            }

            if (!paginated) {
                return items;
            }

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve schedules',
            );
        }
    }

    async createSchedule(
        scheduleData: CreateScheduleBodyDto,
        userSession: UserSession,
    ) {
        // Permission guard
        if (!hasPerm('schedule:create_schedule', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to create schedules",
            );
        }

        // Build payload via factory (consistent normalization)
        const payload = ScheduleFactory.fromCreateDto(
            scheduleData,
            userSession,
        );

        // Duplicate prevention heuristic:
        const existing = await this.scheduleModel.countDocuments({
            client_code: payload.client_code,
            task: payload.task,
            receive_date: payload.receive_date,
            delivery_date: payload.delivery_date,
        });
        if (existing > 0) {
            throw new BadRequestException(
                'A schedule with same client, task and dates already exists',
            );
        }

        try {
            const created = await this.scheduleModel.create(payload);

            if (!created) {
                throw new BadRequestException('Unable to create schedule');
            }
            return created;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to create schedule');
        }
    }

    async deleteSchedule(scheduleId: string, userSession: UserSession) {
        if (!hasPerm('schedule:manage_schedule', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to delete schedules",
            );
        }

        const existing = await this.scheduleModel.findById(scheduleId).exec();
        if (!existing) {
            throw new BadRequestException('Schedule not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Deleted the schedule successfully' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to delete schedule');
        }
    }

    async updateSchedule(
        scheduleId: string,
        scheduleData: Partial<CreateScheduleBodyDto>,
        userSession: UserSession,
    ) {
        if (!hasPerm('schedule:manage_schedule', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to update schedules",
            );
        }

        const existing = await this.scheduleModel.findById(scheduleId).exec();
        if (!existing) {
            throw new NotFoundException('Schedule not found');
        }

        const patch = ScheduleFactory.fromUpdateDto(scheduleData, userSession);
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        // Duplicate prevention if core identifying fields are changing
        const coreFields: (keyof Schedule)[] = [
            'client_code',
            'task',
            'receive_date',
            'delivery_date',
        ];
        const coreChanged = coreFields.some(f => f in patch);
        if (coreChanged) {
            const candidate = {
                client_code:
                    (patch.client_code as string) || existing.client_code,
                task: (patch.task as string) || existing.task,
                receive_date:
                    (patch.receive_date as string) || existing.receive_date,
                delivery_date:
                    (patch.delivery_date as string) || existing.delivery_date,
                _id: { $ne: scheduleId },
            } as Record<string, unknown>;
            const dup = await this.scheduleModel.countDocuments(candidate);
            if (dup > 0) {
                throw new BadRequestException(
                    'A schedule with same client, task and dates already exists',
                );
            }
        }

        try {
            const updated = await this.scheduleModel
                .findByIdAndUpdate(scheduleId, patch, { new: true })
                .lean()
                .exec();
            if (!updated) {
                throw new InternalServerErrorException(
                    'Unable to update schedule',
                );
            }
            return updated;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update schedule');
        }
    }
}
