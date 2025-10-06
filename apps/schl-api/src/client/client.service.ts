import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSession } from 'src/common/types/user-session.type';
import {
    addIfDefined,
    buildOrRegex,
    createRegexQuery,
} from 'src/common/utils/filter-helpers';
import { Client } from 'src/models/client.schema';
import { CreateClientBodyDto } from './dto/create-client.dto';
import { SearchClientsBodyDto } from './dto/search-clients.dto';
import { ClientFactory } from './factories/client.factory';

interface RegexQuery {
    $regex: string;
    $options: string;
}
interface QueryShape {
    client_code?: RegexQuery;
    country?: RegexQuery;
    contact_person?: RegexQuery;
    marketer?: RegexQuery;
    category?: RegexQuery;
    $or?: Record<string, RegexQuery>[];
}

@Injectable()
export class ClientService {
    constructor(@InjectModel(Client.name) private clientModel: Model<Client>) {}

    async searchClients(
        filters: SearchClientsBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            filtered: boolean;
            paginated: boolean;
        },
    ) {
        const { page, itemsPerPage, filtered, paginated } = pagination;
        const {
            countryName,
            clientCode,
            contactPerson,
            marketerName,
            category,
            generalSearchString,
        } = filters;

        const query: QueryShape = {};
        addIfDefined(query, 'country', createRegexQuery(countryName));
        addIfDefined(query, 'client_code', createRegexQuery(clientCode));
        addIfDefined(query, 'contact_person', createRegexQuery(contactPerson));
        addIfDefined(query, 'marketer', createRegexQuery(marketerName));
        addIfDefined(query, 'category', createRegexQuery(category));

        const searchQuery: QueryShape = { ...query };

        if (
            filtered &&
            Object.keys(query).length === 0 &&
            !generalSearchString
        ) {
            throw new BadRequestException('No filter applied');
        }

        if (generalSearchString) {
            searchQuery.$or = buildOrRegex(generalSearchString, [
                'client_code',
                'country',
                'marketer',
                'category',
                'client_name',
                'contact_person',
                'email',
            ]);
        }

        const skip = (page - 1) * itemsPerPage;
        const count = await this.clientModel.countDocuments(
            searchQuery as Record<string, unknown>,
        );

        // Safer numeric extraction of <clientNumber> for sorting:
        // 1. Split on '_' to isolate the numeric prefix regardless of its length (e.g. 1234_XXXX, 7_ABC).
        // 2. Convert first segment to int with graceful fallback (onError/onNull => 0).
        const basePipeline: any[] = [
            { $match: searchQuery },
            {
                $addFields: {
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
            { $sort: { clientNumber: 1 } },
        ];

        if (paginated) {
            basePipeline.push({ $skip: skip }, { $limit: itemsPerPage });
        }

        basePipeline.push({ $unset: 'clientNumber' });

        const items: Client[] = await this.clientModel
            .aggregate(basePipeline)
            .exec();

        if (!items) {
            throw new BadRequestException('Unable to retrieve clients');
        }

        if (!paginated) {
            return items;
        }

        return {
            pagination: {
                count,
                pageCount: Math.ceil(count / itemsPerPage),
            },
            items,
        };
    }

    async createClient(
        clientData: CreateClientBodyDto,
        userSession: UserSession,
    ) {
        const client_code = clientData.client_code.trim();

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
            // Duplicate key race condition fallback
            if (err?.code === 11000) {
                throw new BadRequestException(
                    'Client with the same code already exists',
                );
            }
            throw new BadRequestException('Unable to create client');
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

        // If client_code is changing, ensure no duplicate
        if (
            clientData.client_code &&
            clientData.client_code.trim() !== existing.client_code
        ) {
            const dup = await this.clientModel
                .countDocuments({
                    client_code: clientData.client_code.trim(),
                })
                .exec();
            if (dup > 0) {
                throw new BadRequestException(
                    'Client with the same code already exists',
                );
            }
        }

        const patch = ClientFactory.fromUpdateDto(clientData, userSession);
        if (Object.keys(patch).length === 0) {
            throw new BadRequestException('No update fields provided');
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
            if (err?.code === 11000) {
                throw new BadRequestException(
                    'Client with the same code already exists',
                );
            }
            throw new BadRequestException('Unable to update client');
        }
    }
}
