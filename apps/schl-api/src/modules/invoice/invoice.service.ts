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
    createRegexQuery,
} from 'src/common/utils/filter-helpers';
import { hasPerm } from 'src/common/utils/permission-check';
import { Client } from 'src/models/client.schema';
import { Invoice } from 'src/models/invoice.schema';
import { CreateInvoiceBodyDto } from './dto/create-invoice.dto';
import {
    SearchInvoicesBodyDto,
    SearchInvoicesQueryDto,
} from './dto/search-invoices.dto';
import { InvoiceFactory } from './factories/invoice.factory';

@Injectable()
export class InvoiceService {
    constructor(
        @InjectModel(Invoice.name)
        private readonly invoiceModel: Model<Invoice>,
        @InjectModel(Client.name)
        private readonly clientModel: Model<Client>,
    ) {}

    async deleteInvoice(invoiceNumber: string, userSession: UserSession) {
        if (!hasPerm('accountancy:delete_invoice', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to delete invoice',
            );
        }

        try {
            if (!invoiceNumber) {
                throw new BadRequestException('Invoice number is required');
            }

            const res = await this.invoiceModel.findOneAndDelete({
                invoice_number: invoiceNumber,
            });

            if (!res) {
                throw new InternalServerErrorException(
                    'Unable to delete the invoice',
                );
            }
            return { message: 'Deleted the invoice successfully' };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('An error occurred');
        }
    }

    async createInvoice(body: CreateInvoiceBodyDto, userSession: UserSession) {
        if (!hasPerm('accountancy:create_invoice', userSession.permissions)) {
            throw new ForbiddenException(
                'You do not have permission to create invoice',
            );
        }

        const session = await this.clientModel.db.startSession();
        session.startTransaction();
        try {
            const doc = InvoiceFactory.fromCreateDto(body);
            // Create invoice
            const created = await this.invoiceModel.create([doc], { session });

            // Update client's last invoice number
            const updatedClient = await this.clientModel.findByIdAndUpdate(
                body.clientId,
                { last_invoice_number: Number(body.invoiceNumber) },
                { session, new: true },
            );

            if (!created || created.length === 0 || !updatedClient) {
                await session.abortTransaction();
                await session.endSession();
                throw new InternalServerErrorException(
                    'Unable to store the invoice data',
                );
            }

            await session.commitTransaction();
            await session.endSession();
            return 'Successfully stored the invoice data';
        } catch (e) {
            try {
                await session.abortTransaction();
                await session.endSession();
            } catch {
                // ignore cleanup errors
            }
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to store the invoice data',
            );
        }
    }

    async searchInvoices(
        filters: SearchInvoicesBodyDto,
        pagination: SearchInvoicesQueryDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('accountancy:view_page', userSession.permissions)) {
            // Gate searching invoices behind viewing accountancy page
            throw new ForbiddenException(
                'You do not have permission to view invoices',
            );
        }

        const { page, itemsPerPage, filtered, paginated } = pagination;
        const { invoiceNumber, clientCode, fromDate, toDate } = filters;

        type QueryShape = {
            client_code?: ReturnType<typeof createRegexQuery>;
            invoice_number?: ReturnType<typeof createRegexQuery>;
            createdAt?: { $gte?: Date; $lte?: Date };
        };

        const query: QueryShape = {};

        // Date range on createdAt
        applyDateRange(query, 'createdAt', fromDate, toDate);

        // Add regex fields

        addIfDefined(
            query,
            'invoice_number',
            createRegexQuery(invoiceNumber, {
                exact: false,
                flexible: true,
            }),
        );
        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, {
                exact: false,
                flexible: true,
            }),
        );

        if (filtered && !invoiceNumber && !clientCode && !fromDate && !toDate) {
            throw new BadRequestException('No filter applied');
        }

        const searchQuery: QueryShape = { ...query };

        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        if (paginated) {
            const skip = (page - 1) * itemsPerPage;
            const count = await this.invoiceModel.countDocuments(
                searchQuery as Record<string, unknown>,
            );

            const items = await this.invoiceModel
                .aggregate([
                    { $match: searchQuery },
                    { $sort: sortQuery },
                    { $skip: skip },
                    { $limit: itemsPerPage },
                ])
                .exec();

            if (!items) {
                throw new InternalServerErrorException(
                    'Unable to retrieve invoices',
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

        const items = await this.invoiceModel
            .find(searchQuery as Record<string, unknown>)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        if (!items) {
            throw new InternalServerErrorException(
                'Unable to retrieve invoices',
            );
        }
        return items;
    }
}
