import { IsNotEmpty } from 'class-validator';

export class DeleteInvoiceQueryDto {
    @IsNotEmpty()
    invoiceNumber: string;
}
