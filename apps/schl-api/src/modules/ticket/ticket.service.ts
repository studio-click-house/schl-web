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
import { CLOSED_TICKET_STATUSES } from '@repo/common/constants/ticket.constant';
import { Employee } from '@repo/common/models/employee.schema';
import { Ticket } from '@repo/common/models/ticket.schema';
import { User } from '@repo/common/models/user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    applyDateRange,
    normalizeDateInput,
} from '@repo/common/utils/date-helpers';
import {
    addIfDefined,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateTicketBodyDto } from './dto/create-ticket.dto';
import { SearchTicketsBodyDto } from './dto/search-tickets.dto';
import { TicketFactory } from './factories/ticket.factory';

type TicketsPagination = {
    page: number;
    itemsPerPage: number;
    paginated: boolean;
};

type TicketWithName = Ticket & {
    created_by_name?: string;
    assigned_by_name?: string;
};

// when we run aggregation for custom sorting we temporarily add sortPriority
// and mongoose returns plain objects rather than documents. this type helps
// us keep strong typing and avoid `any`.
interface AggregatedTicket extends Ticket {
    sortPriority?: number;
}

@Injectable()
export class TicketService {
    constructor(
        @InjectModel(Ticket.name)
        private readonly ticketModel: Model<Ticket>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,
    ) {}

    private async generateTicketNumber(): Promise<string> {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
        const yyyymm = `${year}${month}`;
        const prefix = `SCHL-T${yyyymm}-`;

        const latest = await this.ticketModel
            .findOne({ ticket_number: new RegExp(`^${prefix}`) })
            .select('ticket_number')
            .sort({ ticket_number: -1 })
            .lean()
            .exec();

        const latestNumber = latest?.ticket_number;
        const lastSequence = latestNumber
            ? Number(latestNumber.split('-').pop() ?? '0')
            : 0;
        const nextSequence = lastSequence + 1;
        const sequencePart = `${nextSequence}`.padStart(4, '0');

        return `${prefix}${sequencePart}`;
    }

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

    async createTicket(body: CreateTicketBodyDto, userSession: UserSession) {
        // if the creator assigns the ticket to someone, record who made that
        // assignment by saving the current user id in `assigned_by`.
        if (!hasPerm('ticket:create_ticket', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to create tickets",
            );
        }

        try {
            const ticketNumber = await this.generateTicketNumber();
            const payload = TicketFactory.fromCreateDto(
                body,
                userSession,
                ticketNumber,
            );

            const created = await this.ticketModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create ticket',
                );
            }
            return created;
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            if (
                err &&
                typeof err === 'object' &&
                'code' in err &&
                err.code === 11000
            ) {
                throw new ConflictException('Ticket number already exists');
            }
            throw new InternalServerErrorException('Unable to create ticket');
        }
    }

    async searchTickets(
        filters: SearchTicketsBodyDto,
        pagination: TicketsPagination,
        myTickets: boolean,
        userSession: UserSession,
    ): Promise<
        | TicketWithName[]
        | {
              pagination: { count: number; pageCount: number };
              items: TicketWithName[];
          }
    > {
        const { page, itemsPerPage, paginated } = pagination;

        const {
            ticketNumber,
            title,
            type,
            status,
            fromDate,
            toDate,
            priority,
            deadlineStatus,
            createdBy,
            assignee,
            excludeClosed,
        } = filters;

        const normalizedFromDate: string | undefined =
            normalizeDateInput(fromDate);
        const normalizedToDate: string | undefined = normalizeDateInput(toDate);

        type QueryShape = {
            ticket_number?: ReturnType<typeof createRegexQuery>;
            title?: ReturnType<typeof createRegexQuery>;
            type?: string;
            status?: string;
            priority?: string;
            createdAt?: { $gte?: Date; $lte?: Date };
            created_by?: Types.ObjectId;
            deadline?: { $lte?: Date } | { $gt?: Date };
        } & Partial<{
            $and: Record<string, unknown>[];
            $or: Record<string, unknown>[];
        }>;

        const query: QueryShape = {};

        applyDateRange(
            query,
            'createdAt',
            normalizedFromDate,
            normalizedToDate,
        );

        // text filters
        addIfDefined(
            query,
            'ticket_number',
            createRegexQuery(ticketNumber, { exact: true }),
        );
        addIfDefined(query, 'title', createRegexQuery(title));
        addIfDefined(query, 'type', type);
        addIfDefined(query, 'status', status);
        addIfDefined(query, 'priority', priority);

        // deadline crossed filter needs to be combined with other clauses using $and
        if (deadlineStatus === 'overdue') {
            // only tickets with a defined deadline that is in the past or now
            const clause = { deadline: { $lte: new Date() } };
            query.$and = query.$and || [];
            query.$and.push(clause);
        } else if (deadlineStatus === 'not-overdue') {
            // tickets with future deadlines or no deadline at all
            const clause = {
                $or: [
                    { deadline: { $gt: new Date() } },
                    { deadline: null },
                    { deadline: { $exists: false } },
                ],
            };
            query.$and = query.$and || [];
            query.$and.push(clause);
        }

        if (excludeClosed) {
            // this can stay at root since it will be ANDed with other root-level keys
            query.status = { $nin: CLOSED_TICKET_STATUSES } as any;
        }

        if (createdBy) {
            query.created_by = new Types.ObjectId(createdBy);
        } else {
            if (myTickets) {
                query.created_by = new Types.ObjectId(userSession.db_id);
            } else if (
                !hasPerm('ticket:review_works', userSession.permissions)
            ) {
                // users without the review_works permission only see their own tickets
                query.created_by = new Types.ObjectId(userSession.db_id);
            }
        }

        // assignee filter: either assigned to specified user or unassigned
        if (assignee) {
            const assigneeId = new Types.ObjectId(assignee);
            const clause = {
                $or: [
                    { 'assignees.db_id': assigneeId },
                    { assignees: { $size: 0 } },
                ],
            };
            query.$and = query.$and || [];
            query.$and.push(clause);
        }

        const sortStage = {
            $addFields: {
                sortPriority: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $in: ['$status', CLOSED_TICKET_STATUSES],
                                },
                                then: 0,
                            },
                            { case: { $eq: ['$priority', 'low'] }, then: 1 },
                            { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                            { case: { $eq: ['$priority', 'high'] }, then: 3 },
                        ],
                        default: 0,
                    },
                },
            },
        };

        const basePipeline: PipelineStage[] = [
            { $match: query } as PipelineStage,
        ];
        basePipeline.push(sortStage);
        basePipeline.push({ $sort: { sortPriority: -1, createdAt: -1 } });

        if (paginated) {
            const skip = (page - 1) * itemsPerPage;
            const count = await this.ticketModel.countDocuments(query);

            const pipeline: PipelineStage[] = [
                ...basePipeline,
                { $skip: skip } as PipelineStage,
                { $limit: itemsPerPage } as PipelineStage,
            ];
            const items = await this.ticketModel
                .aggregate<AggregatedTicket>(pipeline)
                .exec();

            // remove the sort helper field and attach opener name
            const tickets: TicketWithName[] = await Promise.all(
                items.map(async (t: AggregatedTicket) => {
                    const createdById: string = t.created_by?.toString() ?? '';
                    const assignedById: string = t.assigned_by
                        ? t.assigned_by.toString()
                        : '';
                    const createdName = await this.resolveUserName(createdById);
                    const assignedName = assignedById
                        ? await this.resolveUserName(assignedById)
                        : '';
                    const { sortPriority: _sortPriority, ...rest } = t;
                    void _sortPriority;
                    return {
                        ...rest,
                        assigned_by: rest.assigned_by ?? null,
                        created_by_name: createdName,
                        assigned_by_name: assignedName,
                    };
                }),
            );

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items: tickets,
            };
        }

        const items = await this.ticketModel
            .aggregate<AggregatedTicket>(basePipeline)
            .exec();
        const result: TicketWithName[] = await Promise.all(
            items.map(async (t: AggregatedTicket) => {
                const createdById: string = t.created_by?.toString() ?? '';
                const assignedById: string = t.assigned_by?.toString() ?? '';
                const createdName = await this.resolveUserName(createdById);
                const assignedName = assignedById
                    ? await this.resolveUserName(assignedById)
                    : '';
                const { sortPriority: _sortPriority, ...rest } = t;
                void _sortPriority;
                return {
                    ...rest,
                    assigned_by: rest.assigned_by ?? null,
                    created_by_name: createdName,
                    assigned_by_name: assignedName,
                };
            }),
        );
        return result;
    }

    async getTicketByTicketNumber(ticketNo: string, userSession: UserSession) {
        try {
            if (
                !hasAnyPerm(
                    [
                        'ticket:create_ticket',
                        'ticket:review_works',
                        'ticket:submit_daily_work',
                    ],
                    userSession.permissions,
                )
            ) {
                throw new ForbiddenException(
                    "You don't have permission to view tickets",
                );
            }

            const ticket = await this.ticketModel
                .findOne({
                    ticket_number: createRegexQuery(ticketNo, { exact: true }),
                })
                .exec();

            if (!ticket) {
                throw new NotFoundException('Ticket not found');
            }

            if (ticket.created_by.toString() !== userSession.db_id) {
                if (!hasPerm('ticket:review_works', userSession.permissions)) {
                    if (
                        !hasPerm(
                            'ticket:submit_daily_work',
                            userSession.permissions,
                        )
                    ) {
                        throw new ForbiddenException(
                            "You don't have permission to view this ticket",
                        );
                    }

                    throw new ForbiddenException(
                        "You don't have permission to view this ticket",
                    );
                }
                throw new ForbiddenException(
                    "You don't have permission to view this ticket",
                );
            }

            const createdByName = await this.resolveUserName(
                ticket.created_by.toString(),
            );
            const assignedById: string = ticket.assigned_by
                ? ticket.assigned_by.toString()
                : '';
            const assignedByName = assignedById
                ? await this.resolveUserName(assignedById)
                : '';

            return {
                ...ticket.toObject(),
                created_by_name: createdByName,
                assigned_by_name: assignedByName,
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Unable to retrieve ticket');
        }
    }

    async updateTicket(
        ticketId: string,
        ticketData: Partial<CreateTicketBodyDto>,
        userSession: UserSession,
    ): Promise<{ message: string }> {
        const existing = await this.ticketModel.findById(ticketId).exec();
        if (!existing) {
            throw new NotFoundException('Ticket not found');
        }

        // Only owner or reviewer may update
        if (
            !hasPerm('ticket:review_works', userSession.permissions) &&
            existing.created_by.toString() !== userSession.db_id
        ) {
            throw new ForbiddenException(
                "You don't have permission to update this ticket",
            );
        }

        // allow modifying assigned_by when needed
        const patch = TicketFactory.fromUpdateDto(ticketData) as Partial<
            Ticket & { assigned_by?: Types.ObjectId | null }
        >;
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        // apply assignment logic when assignees list is changed
        if (patch.assignees !== undefined) {
            // if assignees are explicitly cleared, also clear assigned_by
            if (
                Array.isArray(patch.assignees) &&
                patch.assignees.length === 0
            ) {
                patch.assigned_by = null;
            } else {
                // for any non-empty assignment change, record the current user
                // unless they are already the one who assigned it
                if (
                    !existing.assigned_by ||
                    existing.assigned_by.toString() !== userSession.db_id
                ) {
                    patch.assigned_by = new Types.ObjectId(userSession.db_id);
                }
            }
        }

        const updated = await this.ticketModel
            .findByIdAndUpdate(ticketId, { $set: patch }, { new: true })
            .exec();

        if (!updated)
            throw new InternalServerErrorException('Unable to update ticket');
        return { message: 'Updated the ticket successfully' };
    }

    async deleteTicket(
        ticketId: string,
        userSession: UserSession,
    ): Promise<{ message: string }> {
        const existing = await this.ticketModel.findById(ticketId).exec();
        if (!existing) throw new NotFoundException('Ticket not found');

        if (
            !hasPerm('ticket:review_works', userSession.permissions) &&
            existing.created_by.toString() !== userSession.db_id
        ) {
            throw new ForbiddenException(
                "You don't have permission to delete this ticket",
            );
        }

        await existing.deleteOne();
        return { message: 'Deleted the ticket successfully' };
    }
}
