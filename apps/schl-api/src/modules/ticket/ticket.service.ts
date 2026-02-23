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
import { type TicketStatus } from '@repo/common/constants/ticket.constant';
import { CommitLog } from '@repo/common/models/commit-log.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { Ticket } from '@repo/common/models/ticket.schema';
import { User } from '@repo/common/models/user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { applyDateRange } from '@repo/common/utils/date-helpers';
import {
    addIfDefined,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateCommitBodyDto } from './dto/create-commit.dto';
import { CreateTicketBodyDto } from './dto/create-ticket.dto';
import { SearchCommitLogsBodyDto } from './dto/search-commit-logs.dto';
import { SearchTicketsBodyDto } from './dto/search-tickets.dto';
import { UpdateCommitBodyDto } from './dto/update-commit.dto';
import { CommitLogFactory } from './factories/commit-log.factory';
import { TicketFactory } from './factories/ticket.factory';

type TicketsPagination = {
    page: number;
    itemsPerPage: number;
    paginated: boolean;
};

// Response type for commit logs list API
// can't extend CommitLog directly because we change created_by to string
export type CommitLogResponse = CommitLog & {
    ticket_number?: string;
    created_by?: string;
    created_by_name?: string;
};

type TicketWithName = Ticket & { opened_by_name?: string };

// when we run aggregation for custom sorting we temporarily add sortPriority
// and mongoose returns plain objects rather than documents. this type helps
// us keep strong typing and avoid `any`.
interface AggregatedTicket extends Ticket {
    sortPriority?: number;
}

// response from search may include opened_by_name on each ticket
// it is added by the service when appropriate

type TicketListResponse = {
    pagination: { count: number; pageCount: number };
    items: TicketWithName[];
};

@Injectable()
export class TicketService {
    constructor(
        @InjectModel(Ticket.name)
        private readonly ticketModel: Model<Ticket>,
        @InjectModel(CommitLog.name)
        private readonly commitLogModel: Model<CommitLog>,
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

    private normalizeDateInput(value?: string): string | undefined {
        if (!value) return undefined;

        const trimmed = value.trim();
        if (!trimmed) return undefined;

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
        if (slashMatch) {
            const [, day, month, year] = slashMatch;
            return `${year}-${month}-${day}`;
        }

        return undefined;
    }

    private async resolveOpenedByName(openedByUserId: string): Promise<string> {
        const user = await this.userModel
            .findById(openedByUserId)
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

    async getTicketById(ticketId: string, userSession: UserSession) {
        if (
            !hasAnyPerm(
                ['ticket:create_ticket', 'ticket:review_tickets'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view this ticket",
            );
        }

        try {
            const ticket = await this.ticketModel.findById(ticketId).exec();
            if (!ticket) {
                throw new NotFoundException('Ticket not found');
            }

            if (
                !hasAnyPerm(
                    ['ticket:create_ticket', 'ticket:review_tickets'],
                    userSession.permissions,
                ) &&
                ticket.opened_by.toString() !== userSession.db_id
            ) {
                throw new ForbiddenException(
                    "You don't have permission to view this ticket",
                );
            }

            const openedByName = await this.resolveOpenedByName(
                ticket.opened_by.toString(),
            );

            return {
                ...ticket.toObject(),
                opened_by_name: openedByName,
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Unable to retrieve ticket');
        }
    }

    async getTicketByTicketNumber(ticketNo: string, userSession: UserSession) {
        if (
            !hasAnyPerm(
                ['ticket:create_ticket', 'ticket:review_tickets'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view this ticket",
            );
        }

        try {
            const ticket = await this.ticketModel
                .findOne({
                    ticket_number: createRegexQuery(ticketNo, { exact: true }),
                })
                .exec();

            if (!ticket) {
                throw new NotFoundException('Ticket not found');
            }

            if (
                !hasAnyPerm(
                    ['ticket:create_ticket', 'ticket:review_tickets'],
                    userSession.permissions,
                ) &&
                ticket.opened_by.toString() !== userSession.db_id
            ) {
                throw new ForbiddenException(
                    "You don't have permission to view this ticket",
                );
            }

            const openedByName = await this.resolveOpenedByName(
                ticket.opened_by.toString(),
            );

            return {
                ...ticket.toObject(),
                opened_by_name: openedByName,
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Unable to retrieve ticket');
        }
    }

    async getWorkLogTickets(userSession: UserSession): Promise<Ticket[]> {
        if (!hasPerm('ticket:review_tickets', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view tickets",
            );
        }

        const excludedStatuses: TicketStatus[] = [
            'resolved',
            'done',
            'no-work',
            'rejected',
        ];

        const query: Record<string, unknown> = {
            status: { $nin: excludedStatuses },
        };

        if (!hasPerm('ticket:review_tickets', userSession.permissions)) {
            query.opened_by = userSession.db_id;
        }

        const items = await this.ticketModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return items as Ticket[];
    }

    async searchTickets(
        filters: SearchTicketsBodyDto,
        pagination: TicketsPagination,
        myTickets: boolean,
        userSession: UserSession,
    ): Promise<Ticket[] | TicketListResponse> {
        const { page, itemsPerPage, paginated } = pagination;

        const { ticketNumber, title, type, status, fromDate, toDate } = filters;
        const normalizedFromDate = this.normalizeDateInput(fromDate);
        const normalizedToDate = this.normalizeDateInput(toDate);

        type QueryShape = {
            ticket_number?: ReturnType<typeof createRegexQuery>;
            title?: ReturnType<typeof createRegexQuery>;
            type?: string;
            status?: string;
            createdAt?: { $gte?: Date; $lte?: Date };
            opened_by?: string;
        } & Partial<{
            $and: Record<string, unknown>[];
            $or: Record<string, unknown>[];
        }>;

        const query: QueryShape = {};

        // date range over createdAt
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

        if (myTickets) {
            query.opened_by = userSession.db_id;
        } else if (!hasPerm('ticket:review_tickets', userSession.permissions)) {
            query.opened_by = userSession.db_id;
        }

        const terminalStatuses: TicketStatus[] = [
            'resolved',
            'rejected',
            'done',
            'no-work',
        ];
        const sortStage = {
            $addFields: {
                sortPriority: {
                    $switch: {
                        branches: [
                            {
                                case: { $in: ['$status', terminalStatuses] },
                                then: 0,
                            },
                            { case: { $eq: ['$priority', 'low'] }, then: 1 },
                            { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                            { case: { $eq: ['$priority', 'high'] }, then: 3 },
                            {
                                case: { $eq: ['$priority', 'critical'] },
                                then: 4,
                            },
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
            const count = await this.ticketModel.countDocuments(
                query as Record<string, unknown>,
            );

            const pipeline: PipelineStage[] = [
                ...basePipeline,
                { $skip: skip } as PipelineStage,
                { $limit: itemsPerPage } as PipelineStage,
            ];
            const items = await this.ticketModel
                .aggregate<AggregatedTicket>(pipeline)
                .exec();

            // remove the helper field and attach opener name
            const paged: TicketWithName[] = await Promise.all(
                items.map(async (t: AggregatedTicket) => {
                    const openedById = t.opened_by?.toString() ?? '';
                    const name = await this.resolveOpenedByName(openedById);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { sortPriority, ...rest } = t;
                    return { ...rest, opened_by_name: name } as TicketWithName;
                }),
            );

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items: paged,
            };
        }

        const items = await this.ticketModel
            .aggregate<AggregatedTicket>(basePipeline)
            .exec();
        const result: TicketWithName[] = await Promise.all(
            items.map(async (t: AggregatedTicket) => {
                const openedById = t.opened_by?.toString() ?? '';
                const name = await this.resolveOpenedByName(openedById);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { sortPriority, ...rest } = t;
                return { ...rest, opened_by_name: name } as TicketWithName;
            }),
        );
        return result;
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
            !hasPerm('ticket:review_tickets', userSession.permissions) &&
            existing.opened_by.toString() !== userSession.db_id
        ) {
            throw new ForbiddenException(
                "You don't have permission to update this ticket",
            );
        }

        const patch = TicketFactory.fromUpdateDto(ticketData);
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        const updated = await this.ticketModel
            .findByIdAndUpdate(ticketId, { $set: patch }, { new: true })
            .exec();

        if (!updated)
            throw new InternalServerErrorException('Unable to update ticket');
        return { message: 'Updated the ticket successfully' };
    }

    async addCommit(
        ticketId: string,
        dto: CreateCommitBodyDto,
        userSession: UserSession,
    ) {
        const existing = await this.ticketModel.findById(ticketId).exec();
        if (!existing) {
            throw new NotFoundException('Ticket not found');
        }

        // Only owner or reviewer may add commits/work-logs
        if (
            !hasPerm('ticket:review_tickets', userSession.permissions) &&
            existing.opened_by.toString() !== userSession.db_id
        ) {
            throw new ForbiddenException(
                "You don't have permission to add a commit to this ticket",
            );
        }

        try {
            const created = await this.commitLogModel.create({
                ticket: existing._id,
                created_by: new Types.ObjectId(userSession.db_id),
                sha: dto.sha ?? '',
                message: dto.message,
                description: dto.description ?? '',
            });

            const ticketPatch: Partial<Ticket> = TicketFactory.fromUpdateDto({
                type: dto.type,
                status: dto.status,
                priority: dto.priority,
            });

            const terminalStatuses: TicketStatus[] = [
                'resolved',
                'rejected',
                'no-work',
                'done',
            ];

            if (dto.status && terminalStatuses.includes(dto.status)) {
                ticketPatch.checked_by = new Types.ObjectId(userSession.db_id);
            }

            if (Object.keys(ticketPatch).length > 0) {
                await this.ticketModel
                    .findByIdAndUpdate(
                        ticketId,
                        { $set: ticketPatch },
                        { new: true },
                    )
                    .exec();
            }

            return created;
        } catch (err: unknown) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException('Unable to add commit');
        }
    }

    // search existing commit logs with optional filters and pagination
    async searchCommitLogs(
        filters: SearchCommitLogsBodyDto,
        pagination: TicketsPagination,
    ): Promise<
        | CommitLogResponse[]
        | {
              pagination: { count: number; pageCount: number };
              items: CommitLogResponse[];
          }
    > {
        const { page, itemsPerPage, paginated } = pagination;
        const { message, ticketNumber, createdBy, fromDate, toDate } = filters;
        const normalizedFromDate = this.normalizeDateInput(fromDate);
        const normalizedToDate = this.normalizeDateInput(toDate);

        const query: Record<string, unknown> = {};

        if (message) {
            addIfDefined(query, 'message', createRegexQuery(message));
        }

        applyDateRange(
            query,
            'createdAt',
            normalizedFromDate,
            normalizedToDate,
        );

        if (ticketNumber) {
            // allow partial search like commit message
            const regex = createRegexQuery(ticketNumber);
            const tickets = await this.ticketModel
                .find({ ticket_number: regex })
                .select('_id')
                .lean()
                .exec();
            if (!tickets || tickets.length === 0) {
                if (paginated) {
                    return {
                        pagination: { count: 0, pageCount: 0 },
                        items: [],
                    };
                }
                return [];
            }
            query.ticket = { $in: tickets.map(t => t._id) };
        }

        if (createdBy) {
            try {
                query.created_by = new Types.ObjectId(createdBy);
            } catch {
                // ignore invalid id, will match nothing
                query.created_by = undefined;
            }
        }

        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        if (paginated) {
            const skip = (page - 1) * itemsPerPage;
            const count = await this.commitLogModel.countDocuments(query);

            type CommitLogLean = CommitLog & {
                ticket?: { ticket_number?: string };
                created_by?: any; // populated user document
            };

            const itemsRaw = await this.commitLogModel
                .find(query)
                .sort(sortQuery)
                .skip(skip)
                .limit(itemsPerPage)
                .populate('ticket', 'ticket_number')
                .populate({
                    path: 'created_by',
                    select: 'employee email username',
                    populate: { path: 'employee', select: 'real_name' },
                })
                .lean<CommitLogLean>()
                .exec();
            const items = itemsRaw as unknown as CommitLogLean[];

            const mapped = items.map(item => {
                const user = item.created_by || {};
                const name =
                    user.employee?.real_name ||
                    user.email ||
                    user.username ||
                    '';
                return {
                    ...item,
                    ticket_number: item.ticket?.ticket_number || '',
                    created_by: user._id ? String(user._id) : '',
                    created_by_name: name,
                } as CommitLogResponse;
            });

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items: mapped,
            };
        }

        type CommitLogLean = CommitLog & {
            ticket?: { ticket_number?: string };
            created_by?: any;
        };

        const itemsRaw = await this.commitLogModel
            .find(query)
            .sort(sortQuery)
            .populate('ticket', 'ticket_number')
            .populate({
                path: 'created_by',
                select: 'employee email username',
                populate: { path: 'employee', select: 'real_name' },
            })
            .lean<CommitLogLean>()
            .exec();
        const items = itemsRaw as unknown as CommitLogLean[];

        const mapped = items.map(item => {
            const user = item.created_by || {};
            const name =
                user.employee?.real_name || user.email || user.username || '';
            return {
                ...item,
                ticket_number: item.ticket?.ticket_number || '',
                created_by: user._id ? String(user._id) : '',
                created_by_name: name,
            } as CommitLogResponse;
        });
        return mapped;
    }

    async updateCommitLog(
        commitId: string,
        dto: UpdateCommitBodyDto,
        userSession: UserSession,
    ) {
        const existing = await this.commitLogModel.findById(commitId).exec();
        if (!existing) throw new NotFoundException('Commit log not found');

        const isOwner =
            (existing as any).created_by?.toString() === userSession.db_id;
        if (!isOwner) {
            throw new ForbiddenException(
                "You don't have permission to edit this commit log",
            );
        }

        const patch = CommitLogFactory.fromUpdateDto(dto);
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No fields provided for update');
        }

        const updated = await this.commitLogModel
            .findByIdAndUpdate(commitId, { $set: patch }, { new: true })
            .exec();
        if (!updated) {
            throw new InternalServerErrorException(
                'Unable to update commit log',
            );
        }
        return updated;
    }

    async deleteCommitLog(commitId: string, userSession: UserSession) {
        const existing = await this.commitLogModel.findById(commitId).exec();
        if (!existing) throw new NotFoundException('Commit log not found');

        const isOwner =
            (existing as any).created_by?.toString() === userSession.db_id;
        const canReview = hasPerm(
            'ticket:review_logs',
            userSession.permissions,
        );
        if (!isOwner && !canReview) {
            throw new ForbiddenException(
                "You don't have permission to delete this commit log",
            );
        }

        await existing.deleteOne();
        return { message: 'Deleted commit log successfully' };
    }

    async deleteTicket(
        ticketId: string,
        userSession: UserSession,
    ): Promise<{ message: string }> {
        const existing = await this.ticketModel.findById(ticketId).exec();
        if (!existing) throw new NotFoundException('Ticket not found');

        if (
            !hasPerm('ticket:review_tickets', userSession.permissions) &&
            existing.opened_by.toString() !== userSession.db_id
        ) {
            throw new ForbiddenException(
                "You don't have permission to delete this ticket",
            );
        }

        await existing.deleteOne();
        return { message: 'Deleted the ticket successfully' };
    }
}
