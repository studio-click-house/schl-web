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
import { InjectModel } from '@nestjs/mongoose';
import { Client } from '@repo/common/models/client.schema';
import { Order } from '@repo/common/models/order.schema';
import { Report } from '@repo/common/models/report.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    addIfDefined,
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import moment from 'moment-timezone';
import { FilterQuery, Model } from 'mongoose';
import { CreateClientBodyDto } from './dto/create-client.dto';
import { SearchClientsBodyDto } from './dto/search-clients.dto';
import { ClientFactory } from './factories/client.factory';

type QueryShape = FilterQuery<Client>;

@Injectable()
export class ClientService {
    private readonly logger = new Logger(ClientService.name);
    constructor(
        @InjectModel(Client.name) private clientModel: Model<Client>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    ) {}

    private async attachOrderUpdate<T extends { client_code?: string | null }>(
        items: T[],
    ): Promise<Array<T & { order_update?: string | null }>> {
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

        // Fetch order_update from reports that are approved regular clients
        const reports = (await this.reportModel
            .aggregate([
                {
                    $match: {
                        client_code: { $in: clientCodes },
                        client_status: 'approved',
                        is_lead: false,
                    },
                },
                {
                    $group: {
                        _id: '$client_code',
                        order_update: { $first: '$order_update' },
                    },
                },
            ])
            .exec()) as Array<{ _id: string; order_update?: string }>;

        const orderUpdateByClientCode: Record<string, string> = {};
        for (const row of reports) {
            if (row?._id && row.order_update) {
                orderUpdateByClientCode[row._id] = row.order_update;
            }
        }

        for (const item of items as Array<
            T & { order_update?: string | null }
        >) {
            const code = item?.client_code;
            if (typeof code === 'string' && code) {
                item.order_update = orderUpdateByClientCode[code] ?? null;
            }
        }

        return items;
    }

    private getOrderFrequencyMatch(orderFrequency: string | undefined): any {
        if (!orderFrequency) return null;

        const now = moment().tz('Asia/Dhaka');
        const consistentMaxDays = 14;
        const regularMinDays = 15;
        const regularMaxDays = 29;
        const irregularMinDays = 30;

        if (orderFrequency === 'consistent') {
            const minDate = now
                .clone()
                .subtract(consistentMaxDays, 'days')
                .toISOString();
            return { last_order_date: { $gte: minDate } };
        } else if (orderFrequency === 'regular') {
            const minDate = now
                .clone()
                .subtract(regularMaxDays, 'days')
                .toISOString();
            const maxDate = now
                .clone()
                .subtract(regularMinDays, 'days')
                .toISOString();
            return {
                last_order_date: { $gte: minDate, $lte: maxDate },
            };
        } else if (orderFrequency === 'irregular') {
            const maxDate = now
                .clone()
                .subtract(irregularMinDays, 'days')
                .toISOString();
            return {
                $or: [
                    { last_order_date: { $lte: maxDate } },
                    { last_order_date: null },
                ],
            };
        }
        return null;
    }

    async searchClients(
        filters: SearchClientsBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            // filtered: boolean;
            paginated: boolean;
        },
    ): Promise<any> {
        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;
        const {
            countryName,
            clientCode,
            contactPerson,
            marketerName,
            category,
            generalSearchString,
            orderFrequency,
        } = filters;

        const query: QueryShape = {};
        addIfDefined(query, 'country', createRegexQuery(countryName));
        addIfDefined(query, 'client_code', createRegexQuery(clientCode));
        addIfDefined(query, 'contact_person', createRegexQuery(contactPerson));
        addIfDefined(query, 'marketer', createRegexQuery(marketerName));
        addIfDefined(query, 'category', createRegexQuery(category));

        const searchQuery: QueryShape = { ...query };

        if (generalSearchString) {
            const or = buildOrRegex(generalSearchString, [
                'client_code',
                'country',
                'marketer',
                'category',
                'client_name',
                'contact_person',
                'email',
            ]);
            if (or.length > 0) searchQuery.$or = or;
        }

        const skip = (page - 1) * itemsPerPage;
        const matchCondition = this.getOrderFrequencyMatch(orderFrequency);

        // Build count pipeline
        const countPipeline: any[] = [
            { $match: searchQuery },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'client_code',
                    foreignField: 'client_code',
                    as: 'orders',
                },
            },
            {
                $addFields: {
                    last_order_date: { $max: '$orders.download_date' },
                },
            },
            { $project: { orders: 0 } },
        ];

        if (matchCondition) {
            countPipeline.push({ $match: matchCondition });
        }

        let count = 0;
        try {
            const countResult = await this.clientModel.aggregate([
                ...countPipeline,
                { $count: 'total' },
            ]);
            count = countResult[0]?.total || 0;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to count clients');
        }

        // Build retrieval pipeline
        const retrievalPipeline: any[] = [
            { $match: searchQuery },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'client_code',
                    foreignField: 'client_code',
                    as: 'orders',
                },
            },
            {
                $addFields: {
                    last_order_date: { $max: '$orders.download_date' },
                    clientNumber: {
                        $convert: {
                            input: {
                                $arrayElemAt: [
                                    { $split: ['$client_code', '_'] },
                                    0,
                                ],
                            },
                            to: 'int',
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
            { $project: { orders: 0 } },
        ];

        if (matchCondition) {
            retrievalPipeline.push({ $match: matchCondition });
        }

        retrievalPipeline.push(
            { $sort: { clientNumber: 1 } },
            { $unset: 'clientNumber' },
        );

        if (paginated) {
            retrievalPipeline.push({ $skip: skip }, { $limit: itemsPerPage });
            const items = await this.clientModel
                .aggregate(retrievalPipeline)
                .exec();
            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        } else {
            const items = await this.clientModel
                .aggregate(retrievalPipeline)
                .exec();
            await this.attachOrderUpdate(items);
            return items;
        }
    }

    async createClient(
        clientData: CreateClientBodyDto,
        userSession: UserSession,
    ) {
        const client_code = clientData.clientCode.trim();

        // Duplicate check (same code)
        const existing = await this.clientModel
            .countDocuments({ client_code })
            .exec();
        if (existing > 0) {
            throw new BadRequestException(
                'Client with the same code already exists',
            );
        }

        // Prepare payload (avoid mutating caller object)
        const payload = ClientFactory.fromCreateDto(clientData, userSession);

        try {
            const created = await this.clientModel.create(payload);
            if (!created) {
                throw new BadRequestException('Failed to create client');
            }
            return created;
        } catch (err: any) {
            // Re-throw known HTTP exceptions to preserve their messages
            if (
                err instanceof BadRequestException ||
                err instanceof ForbiddenException ||
                err instanceof ConflictException ||
                err instanceof NotFoundException ||
                err instanceof InternalServerErrorException
            )
                throw err;
            // Duplicate key race condition fallback
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Client with the same code already exists',
                );
            }
            throw new InternalServerErrorException('Unable to create client');
        }
    }

    async updateClient(
        clientId: string,
        clientData: Partial<CreateClientBodyDto>,
        userSession: UserSession,
    ) {
        // Load existing client
        const existing = await this.clientModel.findById(clientId).exec();
        if (!existing) {
            throw new BadRequestException('Client not found');
        }

        const patch = ClientFactory.fromUpdateDto(clientData, userSession);
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        // If client_code is being changed, check for uniqueness
        if (patch.client_code && patch.client_code !== existing.client_code) {
            const duplicateCount = await this.clientModel.countDocuments({
                _id: { $ne: clientId },
                client_code: patch.client_code,
            });
            if (duplicateCount > 0) {
                throw new ConflictException(
                    'Client with the same code already exists',
                );
            }
        }

        try {
            const updated = await this.clientModel
                .findByIdAndUpdate(clientId, patch, { new: true })
                .exec();
            if (!updated) {
                throw new BadRequestException('Failed to update client');
            }
            return updated;
        } catch (err: any) {
            if (
                err instanceof BadRequestException ||
                err instanceof ForbiddenException ||
                err instanceof ConflictException ||
                err instanceof NotFoundException ||
                err instanceof InternalServerErrorException
            )
                throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Client with the same code already exists',
                );
            }
            throw new InternalServerErrorException('Unable to update client');
        }
    }

    async deleteClient(clientId: string, userSession: UserSession) {
        if (!hasPerm('admin:manage_client', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to delete clients',
            );
        }
        try {
            const deleted = await this.clientModel
                .findByIdAndDelete(clientId)
                .exec();
            if (!deleted) {
                throw new BadRequestException('Client not found');
            }
            return { message: 'Deleted the client successfully' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to delete client');
        }
    }

    async getClientById(client: string, userSession: UserSession) {
        if (!hasPerm('admin:manage_client', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view client details',
            );
        }

        try {
            const found = await this.clientModel.findById(client).exec();
            if (!found) {
                throw new BadRequestException('Client not found');
            }
            return found;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to retrieve client');
        }
    }

    async getClientByCode(client_code: string, userSession: UserSession) {
        if (!hasPerm('admin:manage_client', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to view client details',
            );
        }

        try {
            // this.logger.debug(`Searching for client with code: ${client_code}`);
            const found = await this.clientModel
                .findOne({
                    client_code: createRegexQuery(client_code, { exact: true }),
                })
                .exec();
            if (!found) {
                throw new BadRequestException('Client not found');
            }
            return found;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to retrieve client');
        }
    }
}
