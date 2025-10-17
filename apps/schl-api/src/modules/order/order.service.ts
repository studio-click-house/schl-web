import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSession } from 'src/common/types/user-session.type';
import { applyDateRange } from 'src/common/utils/date-helpers';
import {
    addIfDefined,
    addPlusSeparatedContainsAllField,
    createRegexQuery,
} from 'src/common/utils/filter-helpers';
import { hasAnyPerm, hasPerm } from 'src/common/utils/permission-check';
import { Order } from 'src/models/order.schema';
import { SearchUsersQueryDto } from '../user/dto/search-users.dto';
import { CreateOrderBodyDto } from './dto/create-order.dto';
import { SearchOrdersBodyDto } from './dto/search-orders.dto';
import { OrderFactory } from './factories/order.factory';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    ) {}

    async searchOrders(
        filters: SearchOrdersBodyDto,
        pagination: SearchUsersQueryDto,
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

        const { page, itemsPerPage, filtered, paginated } = pagination;

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

        if (
            filtered &&
            !clientCode &&
            !task &&
            !folder &&
            !type &&
            !status &&
            !fromDate &&
            !toDate &&
            !generalSearchString
        ) {
            throw new BadRequestException('No filter applied');
        }

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
}
