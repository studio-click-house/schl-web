import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { CLIENT_COMMON_COUNTRY } from '@repo/common/constants/client.constant';
import {
    FileCondition,
    JobSelectionType,
} from '@repo/common/constants/order.constant';
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
import {
    calculateTimeDifference,
    normalizeFolderPath,
} from '@repo/common/utils/general-utils';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import mongoose, { Model } from 'mongoose';
import { QnapService } from '../qnap/qnap.service';
// Removed unused AvailableOrdersQueryDto import
import { CreateOrderBodyDto } from './dto/create-order.dto';
import { NewJobBodyDto } from './dto/new-job.dto';
import { OrdersByCountryQueryDto } from './dto/orders-by-country.dto';
import { OrdersByMonthQueryDto } from './dto/orders-by-month.dto';
import { OrdersCDQueryDto } from './dto/orders-cd.dto';
import { OrdersQPQueryDto } from './dto/orders-qp.dto';
import {
    SearchOrdersBodyDto,
    SearchOrdersQueryDto,
} from './dto/search-orders.dto';
import { OrderFactory } from './factories/order.factory';
import {
    escapeRegex,
    getCandidateSuffix,
    joinPath,
    mapFolderPathToQnapPath,
    moveFilesForNewJob,
} from './order.utils';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(Client.name) private readonly clientModel: Model<Client>,
        @InjectModel(Invoice.name)
        private readonly invoiceModel: Model<Invoice>,
        private readonly configService: ConfigService,
        private readonly qnapService: QnapService,
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
            const or = buildOrRegex(generalSearchString, [
                'client_code',
                'client_name',
                'folder',
                'task',
            ]);

            if (or.length > 0) searchQuery.$or = or;
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
                { $project: { customSortField: 0 } },
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

    // Portal: Add a new progress entry to existing order (identified by clientCode + folderPath)
    async newJob(payload: NewJobBodyDto, userSession: UserSession) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to get new jobs",
            );
        }

        const clientCode = String(payload.clientCode || '').trim();
        if (!clientCode)
            throw new BadRequestException('Client code is required');

        const folderPath = String(payload.folderPath || '').trim();
        if (!folderPath)
            throw new BadRequestException('Folder path is required');

        const fileNames = Array.isArray(payload.fileNames)
            ? payload.fileNames
                  .map(fn => String(fn || '').trim())
                  .filter(Boolean)
            : [];
        if (fileNames.length === 0) {
            throw new BadRequestException('At least one file is required');
        }

        const normalizedType = String(payload.jobType || '')
            .trim()
            .toLowerCase();
        const normalizedCondition = String(payload.fileCondition || '')
            .trim()
            .toLowerCase();
        const category = normalizedType.startsWith('qc')
            ? 'qc'
            : normalizedType.startsWith('correction')
              ? 'correction'
              : 'production';

        const session = await this.orderModel.db.startSession();
        session.startTransaction();
        try {
            const existing = await this.orderModel
                .findOne({ client_code: clientCode, folder_path: folderPath })
                .session(session)
                .exec();
            if (!existing) throw new NotFoundException('Order not found');

            // Filter out files that are already in-progress in this order
            const occupiedStatuses = new Set([
                'working',
                'paused',
                'transferred',
            ]);
            const occupiedSet = new Set<string>();
            if (existing && Array.isArray(existing.progress)) {
                for (const p of existing.progress) {
                    if (!Array.isArray(p.files_tracking)) continue;
                    for (const ft of p.files_tracking) {
                        if (
                            ft &&
                            typeof ft.file_name === 'string' &&
                            occupiedStatuses.has(ft.status)
                        ) {
                            occupiedSet.add(String(ft.file_name));
                        }
                    }
                }
            }
            let filteredFileNames = fileNames.filter(f => !occupiedSet.has(f));
            // Cross-order check: exclude files that are already assigned to other orders
            if (filteredFileNames.length > 0) {
                const searchQuery: Record<string, any> = {
                    'progress.files_tracking': {
                        $elemMatch: {
                            file_name: { $in: filteredFileNames },
                            status: { $in: Array.from(occupiedStatuses) },
                        },
                    },
                };
                if (existing && existing._id) {
                    searchQuery._id = { $ne: existing._id };
                }
                const otherOccupiedOrders = await this.orderModel
                    .find(searchQuery)
                    .session(session)
                    .lean()
                    .exec();
                if (otherOccupiedOrders && otherOccupiedOrders.length > 0) {
                    const otherOccupiedSet = new Set<string>();
                    for (const o of otherOccupiedOrders) {
                        if (!Array.isArray(o.progress)) continue;
                        for (const p of o.progress) {
                            if (!Array.isArray(p.files_tracking)) continue;
                            for (const ft of p.files_tracking) {
                                if (
                                    ft &&
                                    typeof ft.file_name === 'string' &&
                                    occupiedStatuses.has(ft.status)
                                ) {
                                    otherOccupiedSet.add(String(ft.file_name));
                                }
                            }
                        }
                    }
                    filteredFileNames = filteredFileNames.filter(
                        f => !otherOccupiedSet.has(f),
                    );
                }
            }
            if (filteredFileNames.length === 0) {
                throw new ConflictException(
                    'All requested files are already in progress',
                );
            }

            const now = new Date();
            const fileStatus = payload.isActive ? 'working' : 'paused';
            const filesTracking = filteredFileNames.map(f => ({
                file_name: f,
                start_timestamp: now,
                end_timestamp: null,
                status: fileStatus,
                total_pause_duration: 0,
                // If the employee does not want to start immediately, mark pause start
                pause_start_timestamp: fileStatus === 'paused' ? now : null,
                transferred_from: null,
            }));

            const progressEntry: Record<string, any> = {
                employee: new mongoose.Types.ObjectId(
                    String(userSession.db_id),
                ),
                shift: payload.shift,
                category: category,
                is_qc: category === 'qc',
                qc_step: category === 'qc' ? Number(payload.qcStep) : null,
                files_tracking: filesTracking,
            };

            const update: Record<string, any> = {
                $push: { progress: progressEntry },
                $set: { updated_by: userSession.real_name ?? null },
            };
            const updated = await this.orderModel
                .findByIdAndUpdate(existing._id, update, {
                    new: true,
                    session,
                })
                .exec();
            if (!updated)
                throw new InternalServerErrorException(
                    'Failed to update order',
                );

            try {
                await moveFilesForNewJob({
                    folderPath,
                    normalizedType,
                    normalizedCondition,
                    qcStep: payload.qcStep,
                    employeeName: userSession.real_name || 'employee',
                    fileNames: filteredFileNames,
                    driveMap: this.configService.get<string>('QNAP_DRIVE_MAP'),
                    qnapService: this.qnapService,
                    logger: this.logger,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                throw new InternalServerErrorException(
                    `File move failed, no progress was added: ${msg}`,
                );
            }

            await session.commitTransaction();
            const skippedFiles = fileNames.filter(
                f => !filteredFileNames.includes(f),
            );
            return { order: updated, skippedFiles };
        } catch (e) {
            await session.abortTransaction();
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update order');
        } finally {
            await session.endSession();
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

    async availableOrders(
        jobType: string,
        userSession: UserSession,
        clientCode?: string,
    ) {
        // Ensure user has permission to pick up jobs
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view available jobs",
            );
        }

        const query: Record<string, any> = {};

        // Common filter: Never show finished orders
        // We will refine status per case below
        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, { exact: true }),
        );

        switch (jobType) {
            case 'General':
                // Standard production work
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                // Production is not yet complete
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;

            case 'Test':
                // Test production work
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;

            case 'QC - General':
                // QC for General orders
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                // Production is complete, so it's ready for QC
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;

            case 'QC - Test':
                // QC for Test orders
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;

            case 'Correction - General':
                // Rework for General orders
                query.type = createRegexQuery('general', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;

            case 'Correction - Test':
                // Rework for Test orders
                query.type = createRegexQuery('test', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;

            default:
                throw new BadRequestException('Invalid job type selected');
        }

        // Return only necessary fields for the dropdown/selection UI
        const items = await this.orderModel
            .find(query)
            .select(
                'client_code folder folder_path _id task quantity production',
            )
            .sort({ download_date: 1 }) // FIFO (First In First Out) usually
            .lean()
            .exec();

        return items || [];
    }

    async availableFolders(
        jobType: string,
        userSession: UserSession,
        clientCode?: string,
    ) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view available jobs",
            );
        }

        const query: Record<string, any> = {};
        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, { exact: true }),
        );

        switch (String(jobType || '').toLowerCase()) {
            case 'general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;
            case 'test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;
            case 'qc_general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;
            case 'qc_test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;
            case 'correction_general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;
            case 'correction_test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;
            default:
                break;
        }

        const pipeline = [
            { $match: query },
            {
                $group: {
                    _id: '$folder_path',
                    folder_name: { $first: '$folder' },
                    client_code: { $first: '$client_code' },
                    orderId: { $first: '$_id' },
                    quantity: { $first: '$quantity' },
                    production: { $first: '$production' },
                },
            },
            {
                $project: {
                    _id: 0,
                    folder_path: '$_id',
                    folder_name: 1,
                    client_code: 1,
                    orderId: 1,
                    quantity: 1,
                    production: 1,
                },
            },
            { $sort: { folder_name: 1 as const } },
        ];

        const groups = (await this.orderModel
            .aggregate(pipeline)
            .exec()) as Array<Record<string, any>>;
        const folders = (groups || []).map((g: Record<string, any>) => {
            const { displayPath, folderKey } = normalizeFolderPath(
                String(g.folder_path || ''),
            );
            return {
                folder_path: g.folder_path,
                folder_name: g.folder_name,
                client_code: g.client_code,
                orderId: g.orderId,
                quantity: g.quantity,
                production: g.production,
                display_path: displayPath,
                folder_key: folderKey,
            };
        });

        return folders;
    }

    async availableFiles(
        folderPath: string,
        jobType: JobSelectionType,
        fileCondition: FileCondition,
        qcStep: number = 1,
    ): Promise<string[]> {
        const normalizedType = jobType.trim().toLowerCase();
        const normalizedCondition = fileCondition.trim().toLowerCase();
        const rawPath = String(folderPath || '').trim();
        if (!rawPath) return [];

        const occupiedStatuses = ['working', 'paused', 'transferred'];

        // Candidate suffix for the selected jobType and condition
        const candidateSuffix = getCandidateSuffix(
            String(normalizedType),
            String(normalizedCondition),
            Number(qcStep || 1),
        );

        const rawCandidatePath = joinPath(rawPath, candidateSuffix);
        const mappedCandidate = mapFolderPathToQnapPath(
            rawCandidatePath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );
        const mappedBase = mapFolderPathToQnapPath(
            rawPath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );

        const occPipeline = [
            {
                $match: {
                    $or: [
                        { folder_path: { $in: [rawPath, rawCandidatePath] } },
                        { folder_path: { $in: [mappedBase, mappedCandidate] } },
                        // Match any subfolders under candidate path (for QC/Done employee folders)
                        {
                            folder_path: {
                                $regex: `^${escapeRegex(mappedCandidate)}/`,
                            },
                        },
                        {
                            folder_path: {
                                $regex: `^${escapeRegex(rawCandidatePath)}/`,
                            },
                        },
                    ],
                },
            },
            { $unwind: '$progress' },
            { $unwind: '$progress.files_tracking' },
            {
                $match: {
                    'progress.files_tracking.status': { $in: occupiedStatuses },
                },
            },
            {
                $group: {
                    _id: null,
                    files: { $addToSet: '$progress.files_tracking.file_name' },
                },
            },
        ];

        const occRes = await this.orderModel.aggregate(occPipeline).exec();
        const occFiles =
            Array.isArray(occRes) &&
            occRes.length > 0 &&
            Array.isArray(occRes[0].files)
                ? (occRes[0].files as string[])
                : [];
        const occupiedSet = new Set<string>(occFiles);

        const filesSet = new Set<string>();
        const parseQnapResponse = (
            resp: any,
        ): Array<{ name: string; isFolder?: boolean }> => {
            if (!resp) return [];
            const candidates: unknown[] = [];
            const collectArrays = (obj: unknown) => {
                if (!obj || typeof obj !== 'object') return;
                if (Array.isArray(obj)) {
                    for (const el of obj) collectArrays(el);
                    return;
                }
                for (const v of Object.values(obj as Record<string, unknown>)) {
                    if (Array.isArray(v)) candidates.push(v as unknown[]);
                    else collectArrays(v);
                }
            };
            collectArrays(resp);
            for (const arr of candidates) {
                if (!Array.isArray(arr)) continue;
                const arrAny = arr as Array<Record<string, unknown>>;
                if (arrAny.length === 0) continue;
                if (
                    arrAny[0] &&
                    typeof arrAny[0] === 'object' &&
                    (arrAny[0].filename ||
                        arrAny[0].name ||
                        arrAny[0].file_name)
                ) {
                    return arrAny.map(it => {
                        const name = String(
                            (it.filename as string | undefined) ||
                                (it.name as string | undefined) ||
                                (it.file_name as string | undefined) ||
                                (it.file as string | undefined) ||
                                '',
                        );
                        const isFolder = Boolean(
                            it.isfolder ||
                                it.is_dir ||
                                it.isFolder ||
                                (it.type as string | undefined) === 'dir' ||
                                (it.filetype as string | undefined) === 'dir',
                        );
                        return { name, isFolder };
                    });
                }
            }
            return [];
        };

        const qnapBase = mapFolderPathToQnapPath(
            rawPath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );
        try {
            const targetPath = joinPath(qnapBase, candidateSuffix);
            // Special-case QC fresh: we need to drill into employee subfolders under PRODUCTION/DONE
            if (
                normalizedType.startsWith('qc') &&
                normalizedCondition === 'fresh'
            ) {
                const donePath = targetPath;
                this.logger.debug(`Calling QNAP path: ${donePath}`);
                const doneResp = await this.qnapService.listFolderContents({
                    path: donePath,
                    limit: 20000,
                });
                const doneEntries = parseQnapResponse(doneResp);
                const subfolders = doneEntries
                    .filter(e => e.isFolder)
                    .map(e => e.name);
                for (const sf of subfolders) {
                    const subpath = joinPath(donePath, sf);
                    this.logger.debug(`Calling QNAP path: ${subpath}`);
                    const subResp = await this.qnapService.listFolderContents({
                        path: subpath,
                        limit: 20000,
                    });
                    const subEntries = parseQnapResponse(subResp);
                    for (const se of subEntries) {
                        if (se.isFolder) continue;
                        if (occupiedSet.has(se.name)) continue;
                        filesSet.add(se.name);
                    }
                }
                return Array.from(filesSet);
            }

            // Generic path listing for others (or QC when condition == 'incomplete')
            this.logger.debug(`Calling QNAP path: ${targetPath}`);
            const resp = await this.qnapService.listFolderContents({
                path: targetPath,
                limit: 20000,
            });
            const entries = parseQnapResponse(resp);
            for (const e of entries) {
                if (e.isFolder) continue;
                if (occupiedSet.has(e.name)) continue;
                filesSet.add(e.name);
            }
            return Array.from(filesSet);
        } catch (err) {
            this.logger.error('getAvailableFiles failed', err as any);
            return [];
        }
    }
}
