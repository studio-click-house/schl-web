import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DailyReport } from '@repo/common/models/daily-report.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { Ticket } from '@repo/common/models/ticket.schema';
import { User } from '@repo/common/models/user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { applyDateRange } from '@repo/common/utils/date-helpers';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { CreateDailyReportBodyDto } from './dto/create-daily-report.dto';
import { SearchDailyReportBodyDto } from './dto/search-daily-report.dto';
import { DailyReportFactory } from './factories/daily-report.factory';

export type DailyReportPagination = {
    page: number;
    itemsPerPage: number;
    paginated: boolean;
};

export interface DailyReportWithName extends DailyReport {
    submitted_by_name?: string | null;
    ticket_number?: string;
    verified_by_name?: string | null;
}

type AggregatedDailyReport =
    | (DailyReport & {
          ticket?: { ticket_number?: string };
          ticket_number?: string;
          submitted_by?: mongoose.Types.ObjectId;
          verified_by?: mongoose.Types.ObjectId;
      })
    | Record<string, unknown>; // fallback to keep pipeline flexible

@Injectable()
export class DailyReportService {
    constructor(
        @InjectModel(DailyReport.name)
        private readonly dailyUpdateModel: Model<DailyReport>,
        @InjectModel(Ticket.name)
        private readonly ticketModel: Model<Ticket>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,
    ) {}

    async createDailyReport(
        body: CreateDailyReportBodyDto,
        userSession: UserSession,
    ) {
        // permission to submit daily report
        if (!hasPerm('ticket:submit_daily_report', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to submit daily report",
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
            const payload = DailyReportFactory.fromCreateDto(
                body,
                userSession.db_id,
            );
            const created = await this.dailyUpdateModel.create(payload);
            return created;
        } catch (e) {
            if (e instanceof Error) {
                throw new InternalServerErrorException(
                    'Unable to create daily report',
                );
            }
            throw new InternalServerErrorException(
                'Unable to create daily report',
            );
        }
    }

    async searchDailyReports(
        filters: SearchDailyReportBodyDto,
        pagination: DailyReportPagination,
        userSession: UserSession,
    ): Promise<
        | DailyReportWithName[]
        | {
              pagination: { count: number; pageCount: number };
              items: DailyReportWithName[];
          }
    > {
        // permission check up front
        if (
            !hasAnyPerm(
                ['ticket:review_reports', 'ticket:submit_daily_report'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view daily reports",
            );
        }

        try {
            const { page, itemsPerPage, paginated } = pagination;
            const query: Record<string, unknown> = {};

            const submitter = filters.submittedBy;
            if (submitter) {
                query.submitted_by = new mongoose.Types.ObjectId(submitter);
            }

            applyDateRange(
                query,
                'createdAt',
                filters.fromDate,
                filters.toDate,
            );

            console.log('Querying daily reports with', { query, pagination });

            // pipeline: match + sort, then ticket lookup; user name resolved
            // post-aggregation to avoid unnecessary lookups and permit using the
            // employee real_name field.
            const pipeline: PipelineStage[] = [
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

            const transformItems = async (
                docs: AggregatedDailyReport[],
            ): Promise<DailyReportWithName[]> => {
                return Promise.all(
                    docs.map(async d => {
                        const submitterId: string =
                            d.submitted_by?.toString() ?? '';
                        const submittedName = submitterId
                            ? await this.resolveUserName(submitterId)
                            : '';

                        const verifierId: string =
                            d.verified_by?.toString() ?? '';
                        const verifiedName = verifierId
                            ? await this.resolveUserName(verifierId)
                            : '';

                        const rest: any = { ...d };
                        delete rest.submitted_by;
                        delete rest.verified_by;

                        return {
                            ...rest,
                            submitted_by_name: submittedName || null,
                            verified_by_name: verifiedName || null,
                        } as DailyReportWithName;
                    }),
                );
            };

            if (!paginated) {
                const raw =
                    await this.dailyUpdateModel.aggregate<AggregatedDailyReport>(
                        pipeline,
                    );
                const items = await transformItems(raw);
                return items;
            }

            const countPipeline: PipelineStage[] = [
                ...pipeline,
                { $count: 'count' },
            ];
            const countResult = await this.dailyUpdateModel.aggregate<{
                count: number;
            }>(countPipeline);
            const count = countResult[0]?.count || 0;

            const rawItems =
                await this.dailyUpdateModel.aggregate<AggregatedDailyReport>([
                    ...pipeline,
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
                'Unable to search daily reports',
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
            .lean<{ employee?: mongoose.Types.ObjectId }>()
            .exec();

        if (!user?.employee) {
            return '';
        }

        const employee = await this.employeeModel
            .findById(user.employee.toString())
            .select('real_name')
            .lean<{ real_name?: string }>()
            .exec();

        return employee?.real_name || '';
    }

    async deleteDailyReport(id: string, userSession: UserSession) {
        if (!hasPerm('ticket:delete_daily_report', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to delete daily reports",
            );
        }

        // consider returning the deleted document or just a success flag
        const res = await this.dailyUpdateModel.findByIdAndDelete(id).exec();
        if (!res) {
            throw new NotFoundException('Daily update not found');
        }
        return { message: 'Deleted' };
    }

    async verifyDailyReport(id: string, userSession: UserSession) {
        // reuse review permission since no dedicated one exists yet
        if (!hasPerm('ticket:review_reports', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to verify daily reports",
            );
        }

        const report = await this.dailyUpdateModel.findById(id).exec();
        if (!report) {
            throw new NotFoundException('Daily report not found');
        }

        if (report.is_verified) {
            // already verified; nothing to do
            return report;
        }

        report.is_verified = true;
        report.verified_by = new mongoose.Types.ObjectId(userSession.db_id);
        try {
            await report.save();
            return report;
        } catch (e) {
            throw new InternalServerErrorException(
                'Unable to verify daily report',
            );
        }
    }
}
