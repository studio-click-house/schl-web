import { Body, Controller, Delete, Post, Query, Req } from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateInvoiceBodyDto } from './dto/create-invoice.dto';
import { DeleteInvoiceQueryDto } from './dto/delete-invoice.dto';
import {
    SearchInvoicesBodyDto,
    SearchInvoicesQueryDto,
} from './dto/search-invoices.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) {}

    @Delete('delete-invoice')
    deleteInvoice(
        @Query() query: DeleteInvoiceQueryDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        return this.invoiceService.deleteInvoice(query.invoiceNumber, req.user);
    }

    @Post('create-invoice')
    async createInvoice(
        @Body() invoiceData: CreateInvoiceBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        const msg = await this.invoiceService.createInvoice(
            invoiceData,
            req.user,
        );
        return { message: msg };
    }

    @Post('search-invoices')
    searchInvoices(
        @Query() query: SearchInvoicesQueryDto,
        @Body() body: SearchInvoicesBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<
        | any[]
        | {
              pagination: { count: number; pageCount: number };
              items: any[];
          }
    > {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
            paginated: query.paginated,
        };
        return this.invoiceService.searchInvoices(body, pagination, req.user);
    }
}
