import { Invoice } from '@repo/common/models/invoice.schema';
import { CreateInvoiceBodyDto } from '../dto/create-invoice.dto';

export class InvoiceFactory {
    static fromCreateDto(dto: CreateInvoiceBodyDto): Partial<Invoice> {
        const totalOrders =
            typeof dto.totalOrders === 'number' ? dto.totalOrders : 0;
        return {
            client_code: dto.clientCode.trim(),
            created_by: dto.createdBy.trim(),
            time_period: {
                fromDate: dto.timePeriod.fromDate,
                toDate: dto.timePeriod.toDate,
            },
            total_orders: totalOrders,
            invoice_number: dto.invoiceNumber.trim(),
        };
    }
}
