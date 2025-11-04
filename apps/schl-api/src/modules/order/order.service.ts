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
            download_date?: { $gte?: Date; $lte?: Date };
            status?: ReturnType<typeof createRegexQuery>;
            $or?: Record<string, RegexQuery>[];
        }

        const query: QueryShape = {};

        // Date range over download_date
        applyDateRange(query, 'download_date', fromDate, toDate);

        // Regex fields: channel (exact), notice_no (exact), title (fuzzy)
        addIfDefined(query, 'folder', createRegexQuery(folder));

        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, { exact: invFlag ?? false }),
        );
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
            const searchPattern = createRegexQuery(generalSearchString);
            if (searchPattern) {
                searchQuery.$or = [
                    { client_code: searchPattern },
                    { client_name: searchPattern },
                    { folder: searchPattern },
                    { task: searchPattern },
                ];
            }
        }

        if (paginated) {
            const count = await this.orderModel.countDocuments(
                searchQuery as Record<string, unknown>,
            );
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
                { $skip: skip },
                { $limit: itemsPerPage },
            ];

            const items = await this.orderModel.aggregate(pipeline).exec();
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

        // Unpaginated path
        const items = await this.orderModel
            .find(searchQuery as Record<string, unknown>)
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
            const payload = OrderFactory.fromCreateDto(orderData);
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

        const updateDoc = OrderFactory.fromUpdateDto(
            orderData,
            userSession.db_id,
        );
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
                exact: true,
            });
        }

        // Fetch clients with pagination
        const [clients, totalClients] = await Promise.all([
            this.clientModel
                .find(clientQuery, { client_code: 1 })
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

        // Fetch relevant orders
        const orders = await this.orderModel
            .find({
                client_code: { $in: clientCodes },
                download_date: { $gte: startDate, $lte: endDate },
            })
            .lean()
            .exec();

        const last12Months: string[] = [];
        for (let i = 11; i >= 0; i--) {
            last12Months.push(moment().subtract(i, 'months').format('YYYY-MM'));
        }

        // Group orders by client and month
        type MonthAgg = { count: number; totalFiles: number };
        const ordersByClient: Record<string, Record<string, MonthAgg>> = {};
        for (const order of orders as any[]) {
            const monthYear = moment(String(order.download_date)).format(
                'YYYY-MM',
            );
            const code = String(order.client_code);
            if (!ordersByClient[code]) ordersByClient[code] = {};
            if (!ordersByClient[code][monthYear])
                ordersByClient[code][monthYear] = { count: 0, totalFiles: 0 };
            ordersByClient[code][monthYear].count += 1;
            ordersByClient[code][monthYear].totalFiles +=
                Number(order.quantity) || 0;
        }

        // Build final response per client with invoiced flag per month
        const items = await Promise.all(
            clients.map(async c => {
                const ordersArr = await Promise.all(
                    last12Months.map(async monthYear => {
                        const formattedMonthYear = moment(
                            monthYear,
                            'YYYY-MM',
                        ).format('MMMM YYYY');
                        const clientMonthMap =
                            ordersByClient[c.client_code] || {};
                        const monthData =
                            clientMonthMap[monthYear] ||
                            ({ count: 0, totalFiles: 0 } as MonthAgg);

                        let invoiced = false;
                        if (monthData.count > 0) {
                            // Compute month range
                            const start = moment(monthYear, 'YYYY-MM')
                                .startOf('month')
                                .format('YYYY-MM-DD');
                            const end = moment(monthYear, 'YYYY-MM')
                                .endOf('month')
                                .format('YYYY-MM-DD');
                            const invoice = await this.invoiceModel
                                .findOne({
                                    client_code: c.client_code,
                                    'time_period.fromDate': { $gte: start },
                                    'time_period.toDate': { $lte: end },
                                })
                                .lean()
                                .exec();
                            invoiced = !!invoice;
                        }

                        return {
                            [formattedMonthYear]: {
                                count: monthData.count,
                                totalFiles: monthData.totalFiles,
                                invoiced,
                            },
                        };
                    }),
                );

                return {
                    client_code: c.client_code,
                    orders: ordersArr,
                };
            }),
        );

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

        // Build orders query
        const orderQuery: Record<string, any> = {};
        applyDateRange(
            orderQuery,
            'download_date',
            query.fromDate,
            query.toDate,
        );

        // Build client filter for the country
        const countryFilter =
            country === 'Others' ? { $nin: CLIENT_COMMON_COUNTRY } : country;
        const clients = await this.clientModel
            .find({ country: countryFilter }, { client_code: 1, country: 1 })
            .lean()
            .exec();

        const result: {
            details: { [key: string]: any }[];
            totalFiles: number;
        } = {
            details: [],
            totalFiles: 0,
        };

        await Promise.all(
            clients.map(async clientData => {
                const orders = await this.orderModel
                    .find({
                        ...orderQuery,
                        client_code: clientData.client_code,
                    })
                    .lean()
                    .exec();
                for (const order of orders) {
                    result.details.push({
                        ...order,
                        country: clientData.country,
                    });
                    result.totalFiles += Number(order.quantity) || 0;
                }
            }),
        );

        return result;
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

        // Query orders in range
        const orderQuery: Record<string, any> = {};
        applyDateRange(orderQuery, 'download_date', from, to);

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
            .find(orderQuery, {
                client_code: 1,
                download_date: 1,
                quantity: 1,
            })
            .lean()
            .exec();

        // Map orders to countries
        for (const order of ordersAll) {
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

        // Build date range list if both provided
        const dateRange: string[] = [];
        if (from && to) {
            const end = new Date(to);
            const current = new Date(from);
            while (current <= end) {
                dateRange.push(current.toISOString().substring(0, 10));
                current.setDate(current.getDate() + 1);
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
                    merged[date] = {
                        date,
                        orderQuantity: 0,
                        fileQuantity: 0,
                    };
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
        applyDateRange(orderQuery, 'download_date', from, to);
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
