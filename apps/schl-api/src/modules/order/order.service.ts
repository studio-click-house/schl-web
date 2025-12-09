import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CLIENT_COMMON_COUNTRY } from '@repo/common/constants/client.constant';
import { Client } from '@repo/common/models/client.schema';
import { Invoice } from '@repo/common/models/invoice.schema';
import { Order } from '@repo/common/models/order.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { applyDateRange, getDateRange } from '@repo/common/utils/date-helpers';
import {
    addIfDefined,
    addPlusSeparatedContainsAllField,
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { calculateTimeDifference } from '@repo/common/utils/general-utils';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { Model } from 'mongoose';
import { CreateOrderBodyDto } from './dto/create-order.dto';
import { OrdersByCountryQueryDto } from './dto/orders-by-country.dto';
import { OrdersByMonthQueryDto } from './dto/orders-by-month.dto';
import { OrdersCDQueryDto } from './dto/orders-cd.dto';
import { OrdersQPQueryDto } from './dto/orders-qp.dto';
import {
    SearchOrdersBodyDto,
    SearchOrdersQueryDto,
} from './dto/search-orders.dto';
import { OrderFactory } from './factories/order.factory';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(Client.name) private readonly clientModel: Model<Client>,
        @InjectModel(Invoice.name)
        private readonly invoiceModel: Model<Invoice>,
    ) {}

    async searchOrders(
        filters: SearchOrdersBodyDto,
        pagination: SearchOrdersQueryDto,
        userSession: UserSession,
    ) {
        if (
            !hasAnyPerm(
                [
                    'task:qc_waitlist',
                    'task:running_tasks',
                    'task:test_and_correction_tasks',
                    'task:running_tasks',
                ],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view orders",
            );
        }

        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;

        const {
            clientCode,
            task,
            folder,
            type,
            fromDate,
            toDate,
            status,
            generalSearchString,
            invoice: invFlag,
        } = filters;

        // Build base query (string date ranges + regex fields)
        interface RegexQuery {
            $regex: string;
            $options: string;
        }
        interface QueryShape extends Record<string, any> {
            folder?: ReturnType<typeof createRegexQuery>;
            client_code?: ReturnType<typeof createRegexQuery>;
            task?: ReturnType<typeof createRegexQuery>;
            type?: ReturnType<typeof createRegexQuery>;
            download_date?: { $gte?: string; $lte?: string };
            status?: ReturnType<typeof createRegexQuery>;
            $or?: Record<string, RegexQuery>[];
        }

        const query: QueryShape = {};

        // Date range over download_date
        applyDateRange(query, 'download_date', fromDate, toDate, {
            asString: true,
        });

        // Regex fields: channel (exact), notice_no (exact), title (fuzzy)
        addIfDefined(query, 'folder', createRegexQuery(folder));

        if (clientCode) {
            // When invoice flag is set we generally want exact client matches
            // so use equality to utilize indexes instead of a regex.
            if (invFlag ?? false) {
                // Force a typed assignment for the equality match to avoid assigning a regex shape
                (query as any).client_code = clientCode.trim();
            } else {
                addIfDefined(
                    query,
                    'client_code',
                    createRegexQuery(clientCode, { exact: false }),
                );
            }
        }
        // For tasks like "A+B+C" we want to match records containing all tokens in any order, possibly with extra tokens
        if (task && task.includes('+')) {
            addPlusSeparatedContainsAllField(query, 'task', task);
        } else {
            addIfDefined(query, 'task', createRegexQuery(task));
        }

        addIfDefined(query, 'type', createRegexQuery(type, { exact: true }));
        addIfDefined(
            query,
            'status',
            createRegexQuery(status, { exact: true }),
        );

        const searchQuery: QueryShape = { ...query };

        // Default sort: prioritize unfinished correction/test, then unfinished, then finished test, then finished; fallback by date desc
        const sortQuery: Record<string, 1 | -1> = {
            customSortField: 1,
            download_date: -1,
        };

        // if (
        //     filtered &&
        //     !clientCode &&
        //     !task &&
        //     !folder &&
        //     !type &&
        //     !status &&
        //     !fromDate &&
        //     !toDate &&
        //     !generalSearchString
        // ) {
        //     throw new BadRequestException('No filter applied');
        // }

        console.log('Search Query:', searchQuery);

        const skip = (page - 1) * itemsPerPage;

        // General search across selected fields
        if (generalSearchString) {
            const or = buildOrRegex(generalSearchString, [
                'client_code',
                'client_name',
                'folder',
                'task',
            ]);

            if (or.length > 0) searchQuery.$or = or;
        }

        if (paginated) {
            // Use a single aggregation pipeline with $facet to get both count and items
            // in one round-trip to MongoDB. This avoids running two queries (count + aggregate)
            // which is expensive for large datasets.
            const pipeline: any[] = [
                { $match: searchQuery },
                {
                    $addFields: {
                        customSortField: {
                            $cond: {
                                if: {
                                    $or: [
                                        {
                                            $and: [
                                                { $eq: ['$status', 'paused'] },
                                                {
                                                    $ne: [
                                                        '$status',
                                                        'finished',
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $and: [
                                                { $eq: ['$type', 'test'] },
                                                {
                                                    $ne: [
                                                        '$status',
                                                        'finished',
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                then: 0,
                                else: {
                                    $cond: {
                                        if: { $ne: ['$status', 'finished'] },
                                        then: 1,
                                        else: {
                                            $cond: {
                                                if: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                '$status',
                                                                'finished',
                                                            ],
                                                        },
                                                        {
                                                            $eq: [
                                                                '$type',
                                                                'test',
                                                            ],
                                                        },
                                                    ],
                                                },
                                                then: 2,
                                                else: 3,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                { $sort: sortQuery },
                {
                    $facet: {
                        items: [
                            { $skip: skip },
                            { $limit: itemsPerPage },
                            { $project: { customSortField: 0 } },
                        ],
                        count: [{ $count: 'total' }],
                    },
                },
            ];

            const aggResult = await this.orderModel.aggregate(pipeline).exec();
            const items = aggResult?.[0]?.items || [];
            const count = aggResult?.[0]?.count?.[0]?.total || 0;
            if (!items) {
                throw new InternalServerErrorException(
                    'Unable to retrieve orders',
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

        // Unpaginated path - when requesting invoice-specific orders (invFlag true),
        // only fetch minimal fields needed for the invoice to reduce network and IO cost.
        const projection: Record<string, 1> | undefined = invFlag
            ? {
                  folder: 1,
                  quantity: 1,
                  rate: 1,
                  createdAt: 1,
                  download_date: 1,
                  delivery_date: 1,
                  task: 1,
                  et: 1,
                  production: 1,
                  qc1: 1,
                  qc2: 1,
                  status: 1,
                  comment: 1,
                  client_code: 1,
                  client_name: 1,
              }
            : undefined;

        const items = await this.orderModel
            .find(searchQuery as Record<string, unknown>, projection)
            .sort({ download_date: 1 })
            .lean()
            .exec();
        if (!items) {
            throw new InternalServerErrorException('Unable to retrieve orders');
        }
        return items;
    }

    async clientOrders(clientCode: string, userSession: UserSession) {
        if (
            !hasAnyPerm(
                ['browse:view_page', 'task:view_page'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view orders",
            );
        }

        const code = (clientCode || '').trim();
        if (!code) {
            throw new BadRequestException('Client code is required');
        }

        const items = await this.orderModel
            .find({ client_code: code })
            .lean()
            .exec();
        if (!items || items.length === 0) {
            throw new BadRequestException('No orders found');
        }
        return items;
    }

    async createOrder(orderData: CreateOrderBodyDto, userSession: UserSession) {
        if (!hasPerm('admin:create_task', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to create task",
            );
        }
        try {
            const payload = OrderFactory.fromCreateDto(orderData, userSession);
            const created = await this.orderModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create order',
                );
            }
            return created;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to create order');
        }
    }

    async deleteOrder(orderId: string, userSession: UserSession) {
        if (!hasPerm('browse:delete_task_approval', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to delete orders",
            );
        }

        const existing = await this.orderModel.findById(orderId).exec();
        if (!existing) {
            throw new BadRequestException('Order not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Deleted the order successfully' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to delete order');
        }
    }

    async finishOrder(orderId: string, userSession: UserSession) {
        if (!hasPerm('browse:edit_task', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to finish orders",
            );
        }

        const existing = await this.orderModel.findById(orderId).exec();
        if (!existing) {
            throw new BadRequestException('Order not found');
        }

        try {
            existing.status = 'finished';
            await existing.save();
            return {
                message: 'Changed the status of the order successfully',
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to change status of the order',
            );
        }
    }

    async redoOrder(orderId: string, userSession: UserSession) {
        if (!hasPerm('browse:edit_task', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to redo orders",
            );
        }

        const existing = await this.orderModel.findById(orderId).exec();
        if (!existing) {
            throw new BadRequestException('Order not found');
        }

        try {
            existing.status = 'correction';
            await existing.save();
            return {
                message: 'Changed the status of the order successfully',
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to change status of the order',
            );
        }
    }

    async updateOrder(
        orderId: string,
        orderData: Partial<CreateOrderBodyDto>,
        userSession: UserSession,
    ) {
        if (!hasPerm('browse:edit_task', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to update orders",
            );
        }

        const existing = await this.orderModel.findById(orderId).exec();
        if (!existing) {
            throw new BadRequestException('Order not found');
        }

        const updateDoc = OrderFactory.fromUpdateDto(orderData, userSession);
        const keys = Object.keys(updateDoc).filter(k => k !== 'updated_by');
        if (keys.length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        try {
            const updated = await this.orderModel.findByIdAndUpdate(
                orderId,
                updateDoc,
                { new: true },
            );
            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update order',
                );
            }
            return updated;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update order');
        }
    }

    async ordersByMonth(
        clientCode: string | undefined,
        pagination: OrdersByMonthQueryDto,
        userSession: UserSession,
    ) {
        if (
            !hasAnyPerm(
                ['accountancy:create_invoice', 'browse:view_page'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view orders",
            );
        }

        const { page, itemsPerPage } = pagination;
        const skip = (page - 1) * itemsPerPage;

        const clientQuery: Record<string, any> = {};
        if (clientCode) {
            clientQuery.client_code = createRegexQuery(clientCode, {
                exact: false,
                flexible: true,
            });
        }

        // Fetch clients with pagination
        const [clients, totalClients] = await Promise.all([
            this.clientModel
                .find(clientQuery, { client_code: 1 })
                .sort({ client_code: 1 })
                .skip(skip)
                .limit(itemsPerPage)
                .lean(),
            this.clientModel.countDocuments(clientQuery),
        ]);

        if (!clients || clients.length === 0) {
            return {
                pagination: {
                    count: totalClients,
                    pageCount: Math.ceil(totalClients / itemsPerPage),
                },
                items: [],
            };
        }

        // Date range: last 12 full months including current month
        const endDate = moment().endOf('month').format('YYYY-MM-DD');
        const startDate = moment()
            .subtract(11, 'months')
            .startOf('month')
            .format('YYYY-MM-DD');
        const clientCodes = clients.map(c => c.client_code);

        // Build last 12 month identifiers (YYYY-MM)
        const last12Months: string[] = [];
        for (let i = 11; i >= 0; i--) {
            last12Months.push(moment().subtract(i, 'months').format('YYYY-MM'));
        }
        const last12MonthsSet = new Set(last12Months);

        // Use aggregation to compute per-client, per-month order counts and file totals
        const ordersAggPipeline: any[] = [
            {
                $match: {
                    client_code: { $in: clientCodes },
                    download_date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $project: {
                    client_code: 1,
                    quantity: 1,
                    month: { $substrBytes: ['$download_date', 0, 7] },
                },
            },
            {
                $group: {
                    _id: { client_code: '$client_code', month: '$month' },
                    count: { $sum: 1 },
                    totalFiles: { $sum: '$quantity' },
                },
            },
        ];

        const invoicesAggPipeline: any[] = [
            {
                $match: {
                    client_code: { $in: clientCodes },
                    'time_period.fromDate': { $gte: startDate },
                    'time_period.toDate': { $lte: endDate },
                },
            },
            {
                $project: {
                    client_code: 1,
                    startMonth: {
                        $substrBytes: ['$time_period.fromDate', 0, 7],
                    },
                    endMonth: {
                        $substrBytes: ['$time_period.toDate', 0, 7],
                    },
                },
            },
            // Only keep invoices that are contained fully inside a single month
            {
                $match: {
                    $expr: { $eq: ['$startMonth', '$endMonth'] },
                },
            },
            {
                $group: {
                    _id: { client_code: '$client_code', month: '$startMonth' },
                },
            },
        ];

        const [ordersAgg, invoicesAgg] = await Promise.all([
            this.orderModel.aggregate(ordersAggPipeline).exec(),
            this.invoiceModel.aggregate(invoicesAggPipeline).exec(),
        ]);

        // Build maps for fast lookup
        type MonthAgg = { count: number; totalFiles: number };
        const ordersByClient: Record<string, Record<string, MonthAgg>> = {};
        for (const row of ordersAgg) {
            const code = String(row._id.client_code);
            const month = String(row._id.month);
            if (!ordersByClient[code]) ordersByClient[code] = {};
            ordersByClient[code][month] = {
                count: Number(row.count) || 0,
                totalFiles: Number(row.totalFiles) || 0,
            };
        }

        const invoiceMap = new Set<string>();
        for (const row of invoicesAgg) {
            const code = String(row._id.client_code);
            const month = String(row._id.month);
            if (!last12MonthsSet.has(month)) continue; // skip months outside our range
            invoiceMap.add(`${code}_${month}`);
        }

        // Build final response per client with invoiced flag per month
        const items = clients.map(c => {
            const ordersArr = last12Months.map(monthYear => {
                const formattedMonthYear = moment(monthYear, 'YYYY-MM').format(
                    'MMMM YYYY',
                );
                const clientMonthMap = ordersByClient[c.client_code] || {};
                const monthData =
                    clientMonthMap[monthYear] ||
                    ({ count: 0, totalFiles: 0 } as MonthAgg);

                let invoiced = false;
                if (monthData.count > 0) {
                    invoiced = invoiceMap.has(`${c.client_code}_${monthYear}`);
                }

                return {
                    [formattedMonthYear]: {
                        count: monthData.count,
                        totalFiles: monthData.totalFiles,
                        invoiced,
                    },
                };
            });

            return {
                client_code: c.client_code,
                orders: ordersArr,
            };
        });

        return {
            pagination: {
                count: totalClients,
                pageCount: Math.ceil(totalClients / itemsPerPage),
            },
            items,
        };
    }

    async ordersByCountry(
        country: string,
        query: OrdersByCountryQueryDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('fileflow:view_page', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view orders",
            );
        }

        // Build base query (download date range stored as YYYY-MM-DD)
        const orderQuery: Record<string, any> = {};
        applyDateRange(
            orderQuery,
            'download_date',
            query.fromDate,
            query.toDate,
            { asString: true },
        );

        // Load client -> country mapping once (needed to resolve non-common countries)
        const clientsAll = await this.clientModel
            .find({}, { client_code: 1, country: 1 })
            .lean()
            .exec();

        const clientCodeCountryMap = clientsAll.reduce(
            (map: Record<string, string>, client) => {
                map[client.client_code] = client.country || 'Others';
                return map;
            },
            {} as Record<string, string>,
        );

        const orders = await this.orderModel.find(orderQuery).lean().exec();

        const normalizedTarget = country;

        const details = orders
            .map(order => {
                const resolved =
                    clientCodeCountryMap[order.client_code] || 'N/A';
                const normalized = CLIENT_COMMON_COUNTRY.includes(resolved)
                    ? resolved
                    : 'Others';
                return {
                    normalized,
                    country: resolved,
                    order,
                };
            })
            .filter(item => item.normalized === normalizedTarget)
            .map(item => ({ ...item.order, country: item.country }))
            .sort((a, b) => {
                const aDate = String(a.download_date ?? '');
                const bDate = String(b.download_date ?? '');
                return bDate.localeCompare(aDate);
            });

        const totalFiles = details.reduce(
            (sum, current) => sum + (Number((current as any).quantity) || 0),
            0,
        );

        return {
            details,
            totalFiles,
        };
    }

    /**
     * Return orders count and file quantities per country per date in the given range.
     *
     * CD = Country & Date
     */
    async ordersCD(query: OrdersCDQueryDto, userSession: UserSession) {
        if (!hasPerm('fileflow:view_page', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view task statistics",
            );
        }

        // Build date range using dateRange days (default 30)
        const days =
            query.dateRange && query.dateRange > 0 ? query.dateRange : 30;
        const { from, to } = getDateRange(days);

        // Build query using string comparison because download_date is stored as "YYYY-MM-DD"
        const orderQuery: Record<string, any> = {};
        applyDateRange(orderQuery, 'download_date', from, to, {
            asString: true,
        });

        // Clients map: client_code -> country (default Others)
        const clientsAll = await this.clientModel
            .find({}, { client_code: 1, country: 1 })
            .lean()
            .exec();

        const clientCodeCountryMap = clientsAll.reduce(
            (map: Record<string, string>, client) => {
                map[client.client_code] = client.country || 'Others';
                return map;
            },
            {} as Record<string, string>,
        );

        // Pre-seed countries including Others
        const ordersDetails: Record<string, any[]> = {
            ...CLIENT_COMMON_COUNTRY.reduce(
                (acc: Record<string, any[]>, c: string) => {
                    acc[c] = [];
                    return acc;
                },
                {},
            ),
            Others: [],
        };

        // Fetch orders in range
        const ordersAll = await this.orderModel
            .find(orderQuery, { client_code: 1, download_date: 1, quantity: 1 })
            .lean()
            .exec();

        // Map orders to countries and normalize download_date to YYYY-MM-DD
        for (const order of ordersAll) {
            let d = String(order.download_date || '').trim();
            if (!d) continue; // skip records with no date
            if (d.includes('T')) {
                const [datePart = d] = d.split('T');
                d = datePart || d;
            }
            if (d.includes(' ')) {
                const [datePart = d] = d.split(' ');
                d = datePart || d;
            }
            order.download_date = d;

            const clientCountry =
                clientCodeCountryMap[order.client_code] || 'Others';
            const targetCountry = ordersDetails[clientCountry]
                ? clientCountry
                : 'Others';
            ordersDetails[targetCountry] = [
                ...(ordersDetails[targetCountry] || []),
                order,
            ];
        }

        // Build date range list inclusive using UTC increments
        const dateRange: string[] = [];
        if (from && to) {
            const end = new Date(to);
            const current = new Date(from);
            while (current <= end) {
                dateRange.push(current.toISOString().substring(0, 10)); // YYYY-MM-DD
                current.setUTCDate(current.getUTCDate() + 1);
            }
        }

        // Aggregate per country per date
        type CountryOrderData = {
            date: string;
            orderQuantity: number;
            fileQuantity: number;
        };
        const ordersCD: Record<string, CountryOrderData[]> = {};

        for (const [country, ordersArr] of Object.entries(ordersDetails)) {
            const merged: Record<string, CountryOrderData> = {};
            for (const order of ordersArr) {
                const date = String(order.download_date);
                if (!merged[date]) {
                    merged[date] = { date, orderQuantity: 0, fileQuantity: 0 };
                }
                merged[date].fileQuantity += Number(order.quantity) || 0;
                merged[date].orderQuantity += 1;
            }

            const fullDateData: Record<string, CountryOrderData> = {};
            for (const d of dateRange) {
                fullDateData[d] = merged[d] || {
                    date: d,
                    orderQuantity: 0,
                    fileQuantity: 0,
                };
            }

            ordersCD[country] = Object.values(fullDateData).sort(
                (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime(),
            );
        }

        return ordersCD;
    }

    /**
     * Return per-day order and file quantities and pending counts.
     *
     * QP = Quantity & Pending
     */
    async ordersQP(query: OrdersQPQueryDto, userSession: UserSession) {
        if (!hasPerm('fileflow:view_page', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view task statistics",
            );
        }

        // Build date range using dateRange days (default 30)
        const days =
            query.dateRange && query.dateRange > 0 ? query.dateRange : 30;
        const { from, to } = getDateRange(days);

        // Query orders in range
        const orderQuery: Record<string, any> = {};
        applyDateRange(orderQuery, 'download_date', from, to, {
            asString: true,
        });
        const orders = await this.orderModel.find(orderQuery).lean().exec();

        // Build a complete date list between from and to (inclusive)
        const dateRange: string[] = [];
        {
            const end = new Date(to);
            const current = new Date(from);
            while (current <= end) {
                dateRange.push(current.toISOString().substring(0, 10));
                current.setDate(current.getDate() + 1);
            }
        }

        type OrderData = {
            date: string;
            orderQuantity: number;
            orderPending: number;
            fileQuantity: number;
            filePending: number;
        };

        // Initialize with zeros
        const merged: Record<string, OrderData> = {};
        for (const d of dateRange) {
            merged[d] = {
                date: d,
                orderQuantity: 0,
                orderPending: 0,
                fileQuantity: 0,
                filePending: 0,
            };
        }

        // Accumulate from orders
        for (const order of orders) {
            const date = String(order.download_date);
            if (!merged[date]) continue;
            const qty = Number((order as any).quantity) || 0;
            merged[date].fileQuantity += qty;
            merged[date].orderQuantity += 1;
            if ((order as any).status !== 'finished') {
                merged[date].filePending += qty;
                merged[date].orderPending += 1;
            }
        }

        return Object.values(merged);
    }

    async unfinishedOrders(userSession: UserSession) {
        if (!hasPerm('task:running_tasks', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view running tasks",
            );
        }

        const pipeline = [
            {
                $match: {
                    status: { $nin: ['finished', 'correction'] },
                    type: { $ne: 'test' },
                    $expr: { $ne: ['$production', '$quantity'] },
                },
            },
        ];

        const orders = (await this.orderModel
            .aggregate(pipeline)
            .exec()) as Array<Partial<Order>>;

        if (!orders)
            return [] as Array<Partial<Order> & { timeDifference: number }>;

        const enriched: Array<Partial<Order> & { timeDifference: number }> =
            orders
                .map(o => ({
                    ...o,
                    timeDifference: calculateTimeDifference(
                        o.delivery_date,
                        o.delivery_bd_time,
                    ),
                }))
                .sort((a, b) => a.timeDifference - b.timeDifference);

        return enriched;
    }

    async qcOrders(userSession: UserSession) {
        if (!hasPerm('task:qc_waitlist', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view qc tasks",
            );
        }

        const pipeline = [
            {
                $match: {
                    status: { $nin: ['finished', 'correction'] },
                    type: { $ne: 'test' },
                    $expr: { $eq: ['$production', '$quantity'] },
                },
            },
        ];

        const orders = (await this.orderModel
            .aggregate(pipeline)
            .exec()) as Array<Partial<Order>>;
        if (!orders)
            return [] as Array<Partial<Order> & { timeDifference: number }>;

        const enriched: Array<Partial<Order> & { timeDifference: number }> =
            orders
                .map(o => ({
                    ...o,
                    timeDifference: calculateTimeDifference(
                        o.delivery_date,
                        o.delivery_bd_time,
                    ),
                }))
                .sort((a, b) => a.timeDifference - b.timeDifference);

        return enriched;
    }

    async reworkOrders(userSession: UserSession) {
        if (
            !hasPerm('task:test_and_correction_tasks', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You don't have permission to view rework tasks",
            );
        }

        const pipeline = [
            {
                $match: {
                    status: { $ne: 'finished' },
                    $or: [{ type: 'test' }, { status: 'correction' }],
                },
            },
        ];

        const orders = (await this.orderModel
            .aggregate(pipeline)
            .exec()) as Array<Partial<Order>>;
        if (!orders)
            return [] as Array<Partial<Order> & { timeDifference: number }>;

        const enriched: Array<Partial<Order> & { timeDifference: number }> =
            orders
                .map(o => ({
                    ...o,
                    timeDifference: calculateTimeDifference(
                        o.delivery_date,
                        o.delivery_bd_time,
                    ),
                }))
                .sort((a, b) => a.timeDifference - b.timeDifference);

        return enriched;
    }

    async getOrder(orderId: string, userSession: UserSession) {
        if (
            !hasAnyPerm(
                ['browse:view_page', 'task:view_page'],
                userSession.permissions,
            )
        ) {
            throw new ForbiddenException(
                "You don't have permission to view orders",
            );
        }

        const order = await this.orderModel.findById(orderId).exec();
        if (!order) {
            throw new BadRequestException('Order not found');
        }

        return order;
    }
}
