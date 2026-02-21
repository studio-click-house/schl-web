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
import { Model, Types } from 'mongoose';
import { CreateCommitBodyDto } from './dto/create-commit.dto';
import { CreateTicketBodyDto } from './dto/create-ticket.dto';
import { SearchTicketsBodyDto } from './dto/search-tickets.dto';
import { TicketFactory } from './factories/ticket.factory';

type TicketsPagination = {
    page: number;
    itemsPerPage: number;
    paginated: boolean;
};

type TicketWithName = Ticket & { opened_by_name?: string };

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

        // For my-tickets page always restrict to current user
        if (myTickets) {
            query.opened_by = userSession.db_id;
        }
        // Otherwise, if user does not have review permission, restrict to own tickets
        else if (!hasPerm('ticket:review_tickets', userSession.permissions)) {
            query.opened_by = userSession.db_id;
        }

        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        if (paginated) {
            const skip = (page - 1) * itemsPerPage;
            const count = await this.ticketModel.countDocuments(
                query as Record<string, unknown>,
            );

            let items = await this.ticketModel
                .find(query as Record<string, unknown>)
                .sort(sortQuery)
                .skip(skip)
                .limit(itemsPerPage)
                .lean()
                .exec();

            // attach opener name
            items = await Promise.all(
                items.map(async t => {
                    const name = await this.resolveOpenedByName(
                        t.opened_by.toString(),
                    );
                    return { ...t, opened_by_name: name };
                }),
            );

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        }

        let items = await this.ticketModel
            .find(query as Record<string, unknown>)
            .sort(sortQuery)
            .lean()
            .exec();

        items = await Promise.all(
            items.map(async t => {
                const name = await this.resolveOpenedByName(
                    t.opened_by.toString(),
                );
                return { ...t, opened_by_name: name };
            }),
        );
        return items;
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
