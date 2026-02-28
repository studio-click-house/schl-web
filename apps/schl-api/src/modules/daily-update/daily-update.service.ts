import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DailyUpdate } from '@repo/common/models/daily-update.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { Ticket } from '@repo/common/models/ticket.schema';
import { User } from '@repo/common/models/user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { applyDateRange } from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Model } from 'mongoose';
import { CreateDailyUpdateBodyDto } from './dto/create-daily-update.dto';
import { SearchDailyUpdateBodyDto } from './dto/search-daily-update.dto';
import { DailyUpdateFactory } from './factories/daily-update.factory';

@Injectable()
export class DailyUpdateService {
    constructor(
        @InjectModel(DailyUpdate.name)
        private readonly dailyUpdateModel: Model<DailyUpdate>,
        @InjectModel(Ticket.name)
        private readonly ticketModel: Model<Ticket>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,
    ) {}

    async createDailyUpdate(
        body: CreateDailyUpdateBodyDto,
        userSession: UserSession,
    ) {
        // permission to submit daily work
        if (!hasPerm('ticket:submit_daily_work', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to submit daily work",
            );
        }

        // if ticket reference provided, validate it
        if (body.ticket) {
            const ticket = await this.ticketModel
                .findById(body.ticket)
                .lean()
                .exec();
            if (!ticket) {
                throw new NotFoundException('Referenced ticket not found');
            }

            // check deadline not passed
            if (ticket.deadline && new Date(ticket.deadline) < new Date()) {
                throw new BadRequestException(
                    'Cannot reference overdue ticket',
                );
            }

            // ticket must be assigned to user or unassigned
            const assignees: any[] = ticket.assignees || [];
            if (assignees.length > 0) {
                const assignedIds = assignees.map(a => String(a.db_id));
                if (!assignedIds.includes(userSession.db_id)) {
                    throw new ForbiddenException('Ticket not assigned to you');
                }
            }
        }

        try {
            const payload = DailyUpdateFactory.fromCreateDto(
                body,
                userSession.db_id,
            );
            const created = await this.dailyUpdateModel.create(payload);
            return created;
        } catch (e) {
            if (e instanceof Error) {
                throw new InternalServerErrorException(
                    'Unable to create daily update',
                );
            }
            throw new InternalServerErrorException(
                'Unable to create daily update',
            );
        }
    }

    async searchDailyUpdates(
        filters: SearchDailyUpdateBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            paginated: boolean;
        },
        userSession: UserSession,
    ): Promise<
        | any[]
        | {
              pagination: { count: number; pageCount: number };
              items: any[];
          }
    > {
        // permission check up front
        if (!hasPerm('ticket:review_works', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view daily updates",
            );
        }

        try {
            const { page, itemsPerPage, paginated } = pagination;
            const query: any = {};

            const submitter = filters.submittedBy;
            if (submitter) {
                query.submitted_by = submitter;
            }

            applyDateRange(
                query,
                'createdAt',
                filters.fromDate,
                filters.toDate,
            );

            console.log('Querying daily updates with', { query, pagination });

            // pipeline: match + sort, then ticket lookup; user name resolved
            // post-aggregation to avoid unnecessary lookups and permit using the
            // employee real_name field.
            const pipeline: any[] = [
                { $match: query },
                { $sort: { createdAt: -1 } },

                // join ticket
                {
                    $lookup: {
                        from: 'tickets',
                        localField: 'ticket',
                        foreignField: '_id',
                        as: 'ticket',
                    },
                },
                {
                    $unwind: {
                        path: '$ticket',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                // add ticket number for convenience; keep submitted_by id so
                // we can look up the name later
                {
                    $addFields: {
                        ticket_number: '$ticket.ticket_number',
                    },
                },

                {
                    $project: {
                        'ticket._id': 0,
                        // leave submitted_by alone (objectid) for later use
                    },
                },
            ];

            const transformItems = async (docs: any[]): Promise<any[]> => {
                return Promise.all(
                    docs.map(async (d: any) => {
                        const id: string = d.submitted_by?.toString() ?? '';
                        const name = id ? await this.resolveUserName(id) : '';
                        const rest = { ...d };
                        delete rest.submitted_by;
                        return {
                            ...rest,
                            submitted_by_name: name || null,
                        };
                    }),
                );
            };

            if (!paginated) {
                const raw = await this.dailyUpdateModel.aggregate(pipeline);
                const items = await transformItems(raw);
                return items;
            }

            const countPipeline = [...pipeline, { $count: 'count' }];
            const countResult =
                await this.dailyUpdateModel.aggregate(countPipeline);
            const count = countResult[0]?.count || 0;

            const rawItems = await this.dailyUpdateModel.aggregate([
                ...pipeline,
                { $skip: (page - 1) * itemsPerPage },
                { $limit: itemsPerPage },
            ]);
            const items = await transformItems(rawItems);

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
                'Unable to search daily updates',
            );
        }
    }

    /**
     * Given a Mongo user ID, resolve the associated employee real_name.
     * Mirrors ticket.service.resolveUserName.
     */
    private async resolveUserName(userId: string): Promise<string> {
        const user = await this.userModel
            .findById(userId)
            .select('employee')
            .lean()
            .exec();

        if (!user?.employee) {
            return '';
        }

        const employee = await this.employeeModel
            .findById(user.employee.toString())
            .select('real_name')
            .lean()
            .exec();

        return employee?.real_name || '';
    }

    async deleteDailyUpdate(id: string, userSession: UserSession) {
        if (!hasPerm('ticket:review_works', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to delete daily updates",
            );
        }

        // consider returning the deleted document or just a success flag
        const res = await this.dailyUpdateModel.findByIdAndDelete(id).exec();
        if (!res) {
            throw new NotFoundException('Daily update not found');
        }
        return { message: 'Deleted' };
    }
}
