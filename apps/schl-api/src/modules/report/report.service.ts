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
import { Approval } from '@repo/common/models/approval.schema';
import { Client } from '@repo/common/models/client.schema';
import { Order } from '@repo/common/models/order.schema';
import { Report } from '@repo/common/models/report.schema';
import { User } from '@repo/common/models/user.schema';
import { PopulatedByEmployeeUser } from '@repo/common/types/populated-user.type';
import { UserSession } from '@repo/common/types/user-session.type';
import { getTodayDate } from '@repo/common/utils/date-helpers';
import {
    addBooleanField,
    addIfDefined,
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { FilterQuery, Model } from 'mongoose';
import { CreateClientBodyDto } from '../client/dto/create-client.dto';
import { ClientFactory } from '../client/factories/client.factory';
import { CreateReportBodyDto } from './dto/create-report.dto';
import {
    SearchReportsBodyDto,
    SearchReportsQueryDto,
} from './dto/search-reports.dto';
import { ReportFactory } from './factories/report.factory';

type QueryShape = FilterQuery<Report>;

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private readonly reportModel: Model<Report>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Client.name)
        private readonly clientModel: Model<Client>,
        @InjectModel(Approval.name)
        private readonly approvalModel: Model<Approval>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    ) {}

    private async attachLastOrderDate<
        T extends { client_code?: string | null },
    >(items: T[]): Promise<Array<T & { last_order_date?: string | null }>> {
        const clientCodes = Array.from(
            new Set(
                items
                    .map(i => i?.client_code)
                    .filter(
                        (c): c is string =>
                            typeof c === 'string' && c.length > 0,
                    ),
            ),
        );

        if (clientCodes.length === 0) return items;

        const lastOrders = (await this.orderModel
            .aggregate([
                { $match: { client_code: { $in: clientCodes } } },
                {
                    $group: {
                        _id: '$client_code',
                        last_order_date: { $max: '$download_date' },
                    },
                },
            ])
            .exec()) as Array<{ _id: string; last_order_date?: string }>;

        const lastOrderByClientCode: Record<string, string> = {};
        for (const row of lastOrders) {
            if (row?._id && row.last_order_date) {
                lastOrderByClientCode[row._id] = row.last_order_date;
            }
        }

        for (const item of items as Array<
            T & { last_order_date?: string | null }
        >) {
            const code = item?.client_code;
            if (typeof code === 'string' && code) {
                item.last_order_date = lastOrderByClientCode[code] ?? null;
            }
        }

        return items;
    }

    async callReportsTrend(userSession: UserSession, marketerName?: string) {
        try {
            if (
                !marketerName &&
                !hasPerm('crm:view_crm_stats', userSession.permissions)
            ) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startDate = now
                .clone()
                .subtract(12, 'months')
                .startOf('month')
                .toDate();
            const endDate = now.clone().endOf('month').toDate();

            // Aggregate counts per month for last 12 months (including current)
            interface AggRow {
                _id: { month: number; year: number };
                count: number;
            }

            const match: Record<string, any> = {
                is_lead: false,
                createdAt: { $gte: startDate, $lte: endDate },
            };
            if (marketerName) match.marketer_name = marketerName;

            const reports = (await this.reportModel
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: {
                                month: { $month: '$createdAt' },
                                year: { $year: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                ])
                .exec()) as AggRow[];

            const result: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const key = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = 0;
            }

            for (const r of reports) {
                const key = moment()
                    .month(Number(r._id.month) - 1)
                    .year(Number(r._id.year))
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = r.count;
            }

            const sorted: Record<string, number> = {};
            const keys = Object.keys(result).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) {
                sorted[k] = result[k]!;
            }

            return sorted;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve reports count',
            );
        }
    }

    async clientsOnboardTrend(userSession: UserSession, marketerName?: string) {
        try {
            if (
                !marketerName &&
                !hasPerm('crm:view_crm_stats', userSession.permissions)
            ) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startWindow = now
                .clone()
                .subtract(12, 'months')
                .startOf('month')
                .format('YYYY-MM-DD');
            const endWindow = now.clone().endOf('month').format('YYYY-MM-DD');

            const buckets: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const key = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                buckets[key] = 0;
            }

            const onboardMatch: Record<string, any> = {
                is_lead: false,
                client_status: 'approved',
                onboard_date: {
                    $gte: startWindow,
                    $lte: endWindow,
                },
            };
            if (marketerName) onboardMatch.marketer_name = marketerName;

            const rows = await this.reportModel
                .aggregate([
                    { $match: onboardMatch },
                    // onboard_date is a string; convert to Date for month/year grouping
                    {
                        $addFields: {
                            onboardDate: {
                                $dateFromString: {
                                    dateString: '$onboard_date',
                                    format: '%Y-%m-%d',
                                },
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                month: { $month: '$onboardDate' },
                                year: { $year: '$onboardDate' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                ])
                .allowDiskUse(true)
                .exec();

            for (const r of rows as Array<{
                _id: { month: number; year: number };
                count: number;
            }>) {
                const key = moment()
                    .month(Number(r._id.month) - 1)
                    .year(Number(r._id.year))
                    .format('MMMM_YYYY')
                    .toLowerCase();
                buckets[key] = r.count;
            }

            const out: Record<string, number> = {};
            const keys = Object.keys(buckets).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) out[k] = buckets[k]!;
            return out;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve clients onboard count',
            );
        }
    }

    async testOrdersTrend(userSession: UserSession, marketerName?: string) {
        try {
            if (
                !marketerName &&
                !hasPerm('crm:view_crm_stats', userSession.permissions)
            ) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startDate = now
                .clone()
                .subtract(12, 'months')
                .startOf('month');
            const endDate = now.clone().endOf('month');

            const result: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const key = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = 0;
            }

            const testMatch: Record<string, any> = { is_lead: false };
            if (marketerName) testMatch.marketer_name = marketerName;

            const rows = await this.reportModel
                .aggregate([
                    { $match: testMatch },
                    { $unwind: '$test_given_date_history' },
                    // Convert string to Date then match by window
                    {
                        $addFields: {
                            testDate: {
                                $dateFromString: {
                                    dateString: '$test_given_date_history',
                                    format: '%Y-%m-%d',
                                },
                            },
                        },
                    },
                    {
                        $match: {
                            testDate: {
                                $gte: startDate.toDate(),
                                $lte: endDate.toDate(),
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                month: { $month: '$testDate' },
                                year: { $year: '$testDate' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                ])
                .allowDiskUse(true)
                .exec();

            for (const r of rows as Array<{
                _id: { month: number; year: number };
                count: number;
            }>) {
                const key = moment()
                    .month(Number(r._id.month) - 1)
                    .year(Number(r._id.year))
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = r.count;
            }

            const sorted: Record<string, number> = {};
            const keys = Object.keys(result).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) sorted[k] = result[k]!;
            return sorted;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve test orders trend',
            );
        }
    }

    async reportStatuses(
        userSession: UserSession,
        fromDate: string,
        toDate: string,
        onlyMarketerName?: string,
    ) {
        try {
            if (
                !onlyMarketerName &&
                !hasPerm('crm:view_crm_stats', userSession.permissions)
            ) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            // Normalize date bounds
            const hasFrom = !!fromDate;
            const hasTo = !!toDate;
            const mFrom = hasFrom
                ? moment(fromDate, 'YYYY-MM-DD', true)
                : moment('0000-01-01', 'YYYY-MM-DD', true);
            const mTo = hasTo
                ? moment(toDate, 'YYYY-MM-DD', true)
                : moment('9999-12-31', 'YYYY-MM-DD', true);

            if (!mFrom.isValid() || !mTo.isValid()) {
                throw new BadRequestException('Invalid date input');
            }

            // Build range for $elemMatch and string-date fields
            const callingRange: { $gte?: string; $lte?: string } = {};
            const onboardRange: { $gte?: string; $lte?: string } = {};
            if (hasFrom) {
                callingRange.$gte = fromDate;
                onboardRange.$gte = fromDate;
            }
            if (hasTo) {
                callingRange.$lte = toDate;
                onboardRange.$lte = toDate;
            }

            // Get marketer names from users (provided_name not null) unless filtering for one
            let marketerNames: string[];
            if (onlyMarketerName) {
                const single = (onlyMarketerName || '').trim();
                marketerNames = single ? [single] : [];
            } else {
                const marketersAgg = await this.userModel
                    .aggregate([
                        { $match: { employee: { $exists: true, $ne: null } } },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'employee',
                                foreignField: '_id',
                                as: 'employee',
                            },
                        },
                        { $unwind: '$employee' },
                        {
                            $group: {
                                _id: null,
                                names: {
                                    $addToSet:
                                        '$employee.company_provided_name',
                                },
                            },
                        },
                        { $project: { _id: 0, names: 1 } },
                    ])
                    .exec();

                const marketerNamesRaw = (marketersAgg?.[0]?.names || []) as
                    | Array<string | null | undefined>
                    | string[];

                marketerNames = marketerNamesRaw
                    .filter((n): n is string => typeof n === 'string')
                    .map(n => (n || '').trim())
                    .filter(n => n.length > 0);
            }

            // Build aggregation pipelines for each metric and run in a single aggregate via $facet
            const callsMatch: Record<string, any> = { is_lead: false };
            if (onlyMarketerName) callsMatch.marketer_name = onlyMarketerName;
            const callsPipeline: any[] = [
                { $match: callsMatch },
                { $unwind: '$calling_date_history' },
            ];
            if (hasFrom || hasTo) {
                callsPipeline.push({
                    $match: { calling_date_history: callingRange },
                });
            }
            callsPipeline.push({
                $group: { _id: '$marketer_name', count: { $sum: 1 } },
            });

            const testsMatch: Record<string, any> = { is_lead: false };
            if (onlyMarketerName) testsMatch.marketer_name = onlyMarketerName;
            const testsPipeline: any[] = [
                { $match: testsMatch },
                { $unwind: '$test_given_date_history' },
            ];
            if (hasFrom || hasTo) {
                testsPipeline.push({
                    $match: { test_given_date_history: callingRange },
                });
            }
            testsPipeline.push({
                $group: { _id: '$marketer_name', count: { $sum: 1 } },
            });

            const leadsMatch: Record<string, any> = { is_lead: true };
            if (onlyMarketerName) leadsMatch.marketer_name = onlyMarketerName;
            const leadsPipeline: any[] = [{ $match: leadsMatch }];
            if (hasFrom || hasTo) {
                leadsPipeline.push({
                    $match: {
                        calling_date_history: { $elemMatch: callingRange },
                    },
                });
            }
            leadsPipeline.push({
                $group: { _id: '$marketer_name', count: { $sum: 1 } },
            });

            const prospectsMatch: Record<string, any> = {
                is_lead: false,
                is_prospected: true,
            };
            if (onlyMarketerName)
                prospectsMatch.marketer_name = onlyMarketerName;
            const prospectsPipeline: any[] = [{ $match: prospectsMatch }];
            if (hasFrom || hasTo) {
                prospectsPipeline.push({
                    $match: {
                        calling_date_history: { $elemMatch: callingRange },
                    },
                });
            }
            prospectsPipeline.push({
                $group: { _id: '$marketer_name', count: { $sum: 1 } },
            });

            const clientsMatch: Record<string, any> = {
                is_lead: false,
                client_status: 'approved',
            };
            if (onlyMarketerName) clientsMatch.marketer_name = onlyMarketerName;
            const clientsPipeline: any[] = [{ $match: clientsMatch }];
            if (hasFrom || hasTo) {
                clientsPipeline.push({
                    $match: { onboard_date: onboardRange },
                });
            }
            clientsPipeline.push({
                $group: { _id: '$marketer_name', count: { $sum: 1 } },
            });

            const facetResult = (await this.reportModel
                .aggregate([
                    {
                        $facet: {
                            calls: callsPipeline,
                            tests: testsPipeline,
                            leads: leadsPipeline,
                            prospects: prospectsPipeline,
                            clients: clientsPipeline,
                        },
                    },
                ])
                .exec()) as Array<{
                calls: Array<{ _id: string; count: number }>;
                tests: Array<{ _id: string; count: number }>;
                leads: Array<{ _id: string; count: number }>;
                prospects: Array<{ _id: string; count: number }>;
                clients: Array<{ _id: string; count: number }>;
            }>;

            const [stats] = facetResult;
            const toMap = (arr: Array<{ _id: string; count: number }>) => {
                const m = new Map<string, number>();
                for (const it of arr) m.set((it._id || '').trim(), it.count);
                return m;
            };
            const callsMap = toMap(stats?.calls || []);
            const testsMap = toMap(stats?.tests || []);
            const leadsMap = toMap(stats?.leads || []);
            const prospectsMap = toMap(stats?.prospects || []);
            const clientsMap = toMap(stats?.clients || []);

            const data: Record<
                string,
                {
                    totalCalls: number;
                    totalLeads: number;
                    totalClients: number;
                    totalTests: number;
                    totalProspects: number;
                }
            > = {};
            // Ensure we include marketers that appear in the aggregated stats
            // (users may not have provided_name, or report.marketer_name may
            // differ), so take the union of `marketerNames` and any keys
            // present in the aggregation facet results.
            const allNamesSet = new Set<string>(marketerNames);
            for (const map of [
                callsMap,
                testsMap,
                leadsMap,
                prospectsMap,
                clientsMap,
            ]) {
                for (const k of map.keys()) {
                    if (k && k.trim().length > 0) allNamesSet.add(k.trim());
                }
            }

            const allNames = Array.from(allNamesSet).sort();

            for (const name of allNames) {
                data[name] = {
                    totalCalls: callsMap.get(name) || 0,
                    totalLeads: leadsMap.get(name) || 0,
                    totalClients: clientsMap.get(name) || 0,
                    totalTests: testsMap.get(name) || 0,
                    totalProspects: prospectsMap.get(name) || 0,
                };
            }

            return data;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve report statuses',
            );
        }
    }

    async searchReports(
        filters: SearchReportsBodyDto,
        pagination: SearchReportsQueryDto,
        userSession: UserSession,
    ) {
        // Basic permission: viewing reports stats also gates report list search
        if (!hasPerm('crm:view_reports', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view reports',
            );
        }

        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;
        const {
            country,
            companyName,
            category,
            marketerName,
            fromDate,
            toDate,
            test,
            prospect,
            onlyLead,
            followupDone,
            regularClient,
            staleClient,
            prospectStatus,
            generalSearchString,
            leadOrigin,
            show,
            freshLead,
            clientApprovalWaiting,
        } = filters;

        const query: QueryShape = {};

        // Regex/string fields
        addIfDefined(query, 'country', createRegexQuery(country));
        addIfDefined(query, 'company_name', createRegexQuery(companyName));
        addIfDefined(query, 'category', createRegexQuery(category));
        addIfDefined(
            query,
            'marketer_name',
            createRegexQuery(marketerName, { exact: true, flexible: false }),
        );
        addIfDefined(
            query,
            'prospect_status',
            createRegexQuery(prospectStatus, { exact: true, flexible: false }),
        );

        // Booleans
        addBooleanField(query, 'is_prospected', prospect);
        addBooleanField(query, 'is_lead', onlyLead || false);
        addBooleanField(query, 'followup_done', followupDone);

        console.log('QUERY => ', query, filters);

        if (regularClient === true && clientApprovalWaiting === true) {
            throw new BadRequestException(
                'Cannot filter by both regularClient and clientApprovalWaiting',
            );
        }

        // Client status: regular clients are approved; non-regular are none|pending
        if (regularClient) {
            query.client_status = 'approved';
        } else if (regularClient === false) {
            query.client_status = { $in: ['none', 'pending'] };
        }

        if (clientApprovalWaiting) {
            query.client_status = 'pending';
        }

        // Fresh lead: not withdrawn
        if (freshLead) {
            query.lead_withdrawn = false;
        }

        // Stale client: no calls in the last 2 months
        if (staleClient) {
            const twoMonthsAgo = moment()
                .tz('Asia/Dhaka')
                .subtract(2, 'months')
                .format('YYYY-MM-DD');
            query.calling_date_history = {
                $not: { $elemMatch: { $gte: twoMonthsAgo } },
            };
        }

        // Date range: use onboard_date for regular clients, calling_date_history otherwise
        if (fromDate || toDate) {
            if (regularClient) {
                query.onboard_date = {
                    ...(fromDate && { $gte: fromDate }),
                    ...(toDate && { $lte: toDate }),
                };
            } else {
                query.calling_date_history = query.calling_date_history || {};
                query.calling_date_history.$elemMatch = {
                    ...(fromDate && { $gte: fromDate }),
                    ...(toDate && { $lte: toDate }),
                };
            }
        }

        if (!fromDate && !toDate && !staleClient) {
            delete query.calling_date_history;
            delete query.onboard_date;
        }

        // If test filter true, convert calling_date_history condition to test_given_date_history
        if (test === true) {
            if (query.calling_date_history) {
                query.test_given_date_history = query.calling_date_history;
                delete query.calling_date_history;
            } else {
                query.test_given_date_history = {
                    $exists: true,
                    $ne: [],
                };
            }
        }

        // Additional marketer scoping: show 'mine' or 'others'
        if (show) {
            const userDoc = await this.userModel
                .findById(userSession.db_id)
                .populate(
                    'employee',
                    '_id e_id real_name company_provided_name',
                )
                .lean<PopulatedByEmployeeUser>()
                .exec();
            const marketerNameFromSession =
                userDoc?.employee.company_provided_name;
            switch (show) {
                case 'all':
                    break;
                case 'others':
                    if (marketerNameFromSession) {
                        query.marketer_name = {
                            $not: createRegexQuery(marketerNameFromSession, {
                                exact: true,
                                flexible: false,
                            })!,
                        };
                    }
                    break;
                case 'mine':
                    console.log(
                        'Marketer name from session:',
                        marketerNameFromSession,
                    );
                    query.marketer_name = createRegexQuery(
                        marketerNameFromSession || '',
                        {
                            exact: true,
                            flexible: false,
                        },
                    );

                    console.log('Applied query:', query.marketer_name);

                    break;
            }
        }

        // Lead origin scoping: only for lead records endpoints
        if (leadOrigin) {
            if (leadOrigin === 'generated') {
                query.lead_origin = 'generated';
            } else {
                query.lead_origin = { $ne: 'generated' };
            }
        }

        const searchQuery: QueryShape = { ...query };

        console.log('Final search query:', searchQuery);

        // Sorting defaults
        let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
        if (
            followupDone === false &&
            regularClient === false &&
            searchQuery.is_lead === false
        ) {
            sortQuery = {
                hasFollowupDate: 1,
                followup_date: 1,
                createdAt: -1,
            };
        }

        // if (
        //     filtered &&
        //     !country &&
        //     !companyName &&
        //     !category &&
        //     !marketerName &&
        //     !prospectStatus &&
        //     !generalSearchString &&
        //     !fromDate &&
        //     !toDate &&
        //     !test &&
        //     prospect !== true &&
        //     followupDone === undefined &&
        //     regularClient === undefined &&
        //     staleClient !== true &&
        //     onlyLead !== true
        // ) {
        //     throw new BadRequestException('No filter applied');
        // }

        // General search
        if (generalSearchString) {
            const generalSearchFields = [
                'marketer_name',
                'country',
                'company_name',
                'contact_person',
                'email_address',
            ];
            if (clientApprovalWaiting !== true) {
                generalSearchFields.push(
                    'category',
                    'designation',
                    'website',
                    'contact_number',
                    'calling_status',
                    'linkedin',
                );
            }

            const ors = buildOrRegex(generalSearchString, generalSearchFields);

            if (ors.length > 0) searchQuery.$or = ors;
        }

        const skip = (page - 1) * itemsPerPage;
        if (paginated) {
            const count = await this.reportModel.countDocuments(
                searchQuery as Record<string, unknown>,
            );
            console.log('Total count:', count, searchQuery);
            const pipeline: any[] = [
                { $match: searchQuery },
                {
                    $addFields: {
                        hasFollowupDate: {
                            $cond: {
                                if: { $eq: ['$followup_date', ''] },
                                then: 1,
                                else: 0,
                            },
                        },
                    },
                },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: itemsPerPage },
                { $project: { hasFollowupDate: 0 } },
            ];
            const items = await this.reportModel.aggregate(pipeline).exec();
            if (!items) {
                throw new InternalServerErrorException(
                    'Unable to retrieve reports',
                );
            }

            await this.attachLastOrderDate(items);
            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        }

        // Unpaginated: simple find
        const items = await this.reportModel
            .find(searchQuery as Record<string, unknown>)
            .lean()
            .exec();
        if (!items) {
            throw new InternalServerErrorException(
                'Unable to retrieve reports',
            );
        }

        await this.attachLastOrderDate(items as any[]);
        return items;
    }

    async createReport(userSession: UserSession, body: CreateReportBodyDto) {
        if (!hasPerm('crm:create_report', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to create report',
            );
        }

        try {
            // Resolve marketer name
            const user = await this.userModel
                .findById(userSession.db_id)
                .populate(
                    'employee',
                    '_id e_id real_name company_provided_name',
                )
                .lean<PopulatedByEmployeeUser>()
                .exec();
            const marketerName = (
                user?.employee.company_provided_name ||
                user?.employee.real_name ||
                user?.username ||
                ''
            ).trim();
            if (!marketerName) {
                throw new BadRequestException(
                    'Marketer name is missing for this user',
                );
            }

            const isLead = body.isLead === true;

            // If creating a lead, check duplicate by flexible company name
            if (isLead && body.companyName) {
                const dup = await this.reportModel.findOne({
                    company_name: createRegexQuery(body.companyName, {
                        exact: false,
                        flexible: true,
                    }),
                });
                if (dup) {
                    throw new ConflictException(
                        'This lead already exists in database',
                    );
                }
            }

            const doc = ReportFactory.fromCreateDto(
                body,
                userSession,
                marketerName,
            );

            const created = await this.reportModel.create(doc);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create a new report',
                );
            }
            return created;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to create report');
        }
    }

    async updateReport(
        id: string,
        body: Partial<CreateReportBodyDto>,
        userSession: UserSession,
    ) {
        if (
            !hasAnyPerm(
                ['crm:edit_report', 'crm:edit_lead'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                'You do not have permission to update report',
            );
        }

        try {
            console.log('Update body:', body);

            const update = ReportFactory.fromUpdateDto(
                body,
                getTodayDate(),
                userSession,
            );

            console.log('Update data:', update);

            const updated = await this.reportModel
                .findByIdAndUpdate(id, update, { new: true })
                .exec();

            if (!updated) {
                throw new BadRequestException('Failed to update report');
            }
            return updated;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update report');
        }
    }

    async convertToClient(
        userSession: UserSession,
        clientBody: CreateClientBodyDto,
        reportId: string,
    ) {
        if (!hasPerm('crm:check_client_request', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to approve client requests',
            );
        }

        // Start a transaction
        const session = await this.clientModel.db.startSession();
        session.startTransaction();
        try {
            // 1) Ensure unique client_code
            const existingCount = await this.clientModel.countDocuments(
                { client_code: clientBody.clientCode },
                { session },
            );
            if (existingCount > 0) {
                await session.abortTransaction();
                await session.endSession();
                throw new ConflictException(
                    'Client with the same code already exists',
                );
            }

            // 2) Create client
            const clientData = ClientFactory.fromCreateDto(
                clientBody,
                userSession,
            );
            const created = await this.clientModel.create([clientData], {
                session,
            });
            if (!created || created.length === 0) {
                await session.abortTransaction();
                await session.endSession();
                throw new InternalServerErrorException(
                    'Unable to create new client',
                );
            }

            console.log('Created client:', created);

            // 3) Update corresponding report.
            const updatedReport = await this.reportModel.findOneAndUpdate(
                { _id: reportId, is_lead: false },
                {
                    client_status: 'approved',
                    onboard_date: getTodayDate(),
                    client_code: clientBody.clientCode,
                },
                { new: true, session },
            );

            if (!updatedReport) {
                await session.abortTransaction();
                await session.endSession();
                throw new InternalServerErrorException(
                    'Unable to change the status of the report',
                );
            }

            await session.commitTransaction();
            // Extract plain client object for response
            const createdClientDoc = created[0];
            const client: Client =
                typeof createdClientDoc?.toObject === 'function'
                    ? createdClientDoc.toObject()
                    : (createdClientDoc as Client);
            await session.endSession();
            return { message: 'Added the client successfully', client };
        } catch (e) {
            // Ensure transaction cleanup
            try {
                await session.abortTransaction();
                await session.endSession();
            } catch {
                // ignore cleanup errors
            }
            // Re-throw known http exceptions, otherwise wrap
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('An error occurred');
        }
    }

    async rejectClientRequest(userSession: UserSession, id: string) {
        if (!hasPerm('crm:check_client_request', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to reject client requests',
            );
        }

        try {
            const updated = await this.reportModel
                .findByIdAndUpdate(id, { client_status: 'none' }, { new: true })
                .exec();

            if (!updated) {
                throw new BadRequestException(
                    'Unable reject regular client request',
                );
            }

            return { message: 'Rejected regular client request' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('An error occurred');
        }
    }

    async markDuplicateClientRequest(
        userSession: UserSession,
        reportId: string,
        clientCode: string,
    ) {
        if (!hasPerm('crm:check_client_request', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to mark duplicate client requests',
            );
        }

        const normalizedClientCode = clientCode?.trim();
        if (!normalizedClientCode) {
            throw new BadRequestException('Client code is required');
        }

        try {
            const updated = await this.reportModel
                .findByIdAndUpdate(
                    reportId,
                    {
                        client_status: 'approved',
                        onboard_date: getTodayDate(),
                        client_code: normalizedClientCode,
                    },
                    { new: true },
                )
                .exec();

            if (!updated) {
                throw new BadRequestException(
                    'Failed to mark the request as duplicate',
                );
            }

            return 'Marked the request as duplicate client';
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to mark the request as duplicate',
            );
        }
    }

    async followupCountForToday(
        userSession: UserSession,
        marketerName: string,
    ) {
        if (!hasPerm('crm:view_reports', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view reports',
            );
        }

        try {
            const today = getTodayDate();
            const count = await this.reportModel.countDocuments({
                marketer_name: marketerName,
                followup_date: { $lte: today, $ne: '', $exists: true },
                followup_done: false,
                is_lead: false,
            });
            return count;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to fetch follow-up count',
            );
        }
    }

    async recallCount(userSession: UserSession, marketerName: string) {
        if (!hasPerm('crm:view_reports', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view reports',
            );
        }

        try {
            const today = getTodayDate();

            // Directly approved recalls for today
            const recallCount1 = await this.reportModel.countDocuments({
                marketer_name: marketerName,
                is_lead: false,
                calling_date_history: today,
                $expr: {
                    $and: [
                        { $gt: [{ $size: '$calling_date_history' }, 1] },
                        {
                            $ne: [
                                { $arrayElemAt: ['$calling_date_history', 0] },
                                today,
                            ],
                        },
                    ],
                },
            });

            // Pending approvals that have calling_date_history change ending today
            const pendingApprovals = await this.approvalModel
                .find({
                    target_model: 'Report',
                    action: 'update',
                    status: 'pending',
                    changes: { $exists: true },
                })
                .lean()
                .exec();

            // Filter pending approvals to only those that updated the 'calling_date_history' today.
            // Criteria:
            // - The approval has a change with field === 'calling_date_history'.
            // - The change's newValue is an array with at least two entries (a history).
            // - The first date in the history is NOT today, and the last date IS today.
            //   This implies the history was updated to include today as the latest entry.
            const validApprovals = (pendingApprovals || []).filter(appr => {
                const changes = appr.changes as
                    | Array<{ field: string; newValue: any }>
                    | undefined;
                if (!changes) return false;

                for (const c of changes) {
                    if (
                        c.field === 'calling_date_history' &&
                        Array.isArray(c.newValue)
                    ) {
                        const history = c.newValue as string[];
                        const len = history.length;
                        if (
                            len >= 2 &&
                            history[0] !== today &&
                            history[len - 1] === today
                        ) {
                            return true;
                        }
                        break;
                    }
                }
                return false;
            });

            const reportIds = validApprovals.reduce<string[]>((acc, a) => {
                if (a.object_id) acc.push(String(a.object_id));
                return acc;
            }, []);

            const recallCount2 = await this.reportModel.countDocuments({
                _id: { $in: reportIds },
                marketer_name: marketerName,
                is_lead: false,
            });

            return recallCount1 + recallCount2;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to fetch recall count',
            );
        }
    }

    async withdrawLead(reportId: string, userSession: UserSession) {
        // Permission: withdrawing a lead modifies reports
        if (!hasPerm('crm:edit_lead', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to withdraw lead',
            );
        }

        try {
            const marketerRealName = userSession.real_name;
            // Step 1: mark the source report as a withdrawn lead
            const leadData = await this.reportModel
                .findByIdAndUpdate(
                    reportId,
                    {
                        updated_by: marketerRealName,
                        is_lead: true,
                        lead_withdrawn: true,
                    },
                    { new: true },
                )
                .lean()
                .exec();

            const isEmpty = (str?: string | null) => !str || str.trim() === '';

            if (!leadData) {
                throw new InternalServerErrorException(
                    'Unable to change the lead status',
                );
            }

            // Step 2: create a new report using the lead data
            const today = getTodayDate();

            if (leadData.lead_origin !== 'generated') {
                const reportData = await this.reportModel
                    .findOneAndUpdate(
                        {
                            marketer_name: leadData.lead_origin,
                            company_name: leadData.company_name,
                            is_lead: false,
                            lead_withdrawn: true,
                        },
                        ReportFactory.fromLeadToReportDoc(
                            leadData,
                            today,
                            marketerRealName,
                        ),
                        { upsert: true, new: true },
                    )
                    .exec();

                if (reportData) return reportData;
                throw new InternalServerErrorException(
                    'Unable to create a new report using the lead data. Please create one manually',
                );
            } else {
                // lead_origin === 'generated' branch
                if (
                    isEmpty(leadData.contact_person) ||
                    isEmpty(leadData.company_name) ||
                    isEmpty(leadData.category) ||
                    isEmpty(leadData.website) ||
                    isEmpty(leadData.designation) ||
                    isEmpty(leadData.country) ||
                    isEmpty(leadData.marketer_name) ||
                    isEmpty(leadData.marketer_id)
                ) {
                    throw new BadRequestException('Lead data is missing');
                }

                const created = await this.reportModel.create(
                    ReportFactory.fromLeadToReportDoc(
                        leadData,
                        today,
                        marketerRealName,
                    ),
                );

                if (!created) {
                    throw new InternalServerErrorException(
                        'Unable to create a new report using the lead data. Please create one manually',
                    );
                }
                return created;
            }
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to withdraw lead');
        }
    }

    async doneFollowup(
        reportId: string,
        userSession: UserSession,
        marketerCompanyName: string,
    ) {
        // Permission: marking followup done modifies reports
        if (!hasPerm('crm:edit_report', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to mark follow-up done',
            );
        }

        try {
            const report = await this.reportModel
                .findById(reportId)
                .lean()
                .exec();
            if (!report) {
                throw new NotFoundException('Report not found');
            }

            // Check if the report belongs to the marketer
            if (report.marketer_name !== marketerCompanyName) {
                throw new ForbiddenException(
                    'You do not have permission to modify this report',
                );
            }

            if (report.followup_date === '' || !report.followup_date) {
                throw new BadRequestException('Follow-up date is not set');
            }

            // Mark the follow-up as done
            report.followup_done = true;
            report.updated_by = userSession.real_name;
            await this.reportModel.findByIdAndUpdate(reportId, report).exec();

            return { message: 'Follow-up marked as done' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to mark follow-up as done',
            );
        }
    }

    async getReport(reportId: string, userSession: UserSession) {
        if (!hasPerm('crm:view_reports', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view reports',
            );
        }

        try {
            const report = await this.reportModel
                .findById(reportId)
                .lean()
                .exec();
            if (!report) {
                throw new NotFoundException('Report not found');
            }

            // Check if the report belongs to the marketer
            // if (report.marketer_id !== userSession.db_id) {
            //     throw new ForbiddenException(
            //         'You do not have permission to modify this report',
            //     );
            // }

            return report;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve the report',
            );
        }
    }

    async removeClientFromReport(
        reportId: string,
        userSession: UserSession,
        marketerCompanyName: string,
    ) {
        // Permission: who can remove a client from a report
        if (!hasPerm('crm:remove_client', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to remove client from report',
            );
        }

        try {
            const report = await this.reportModel
                .findById(reportId)
                .lean()
                .exec();
            if (!report) {
                throw new NotFoundException('Report not found');
            }

            // Check if the report belongs to the marketer
            if (report.marketer_name !== marketerCompanyName) {
                throw new ForbiddenException(
                    'You do not have permission to modify this report',
                );
            }

            // Remove the client from the report
            report.client_status = 'none';
            // report.onboard_date = ''; // keep onboard date intact for record/graph purposes
            report.updated_by = userSession.real_name;
            report.client_code = '';
            await this.reportModel.findByIdAndUpdate(reportId, report).exec();

            return { message: 'Client removed from report' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to remove client from report',
            );
        }
    }
}
