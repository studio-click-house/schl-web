import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CreateTicketBodyDto } from './dto/create-ticket.dto';
import {
    SearchTicketsBodyDto,
    SearchTicketsQueryDto,
} from './dto/search-tickets.dto';
import { TicketService } from './ticket.service';

@Controller('ticket')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post('create-ticket')
    createTicket(
        @Body() body: CreateTicketBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.ticketService.createTicket(body, req.user);
    }

    @Get('get-ticket/:id')
    getTicketById(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.ticketService.getTicketById(id, req.user);
    }

    @Get('get-ticket')
    getTicketByTicketNumber(
        @Req() req: Request & { user: UserSession },
        @Query() query: { ticketNo: string },
    ) {
        return this.ticketService.getTicketByTicketNumber(
            query.ticketNo,
            req.user,
        );
    }

    @Post('search-tickets')
    searchTickets(
        @Query() query: SearchTicketsQueryDto,
        @Body() body: SearchTicketsBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<unknown> {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };
        return this.ticketService.searchTickets(
            body,
            pagination,
            query.myTickets || false,
            req.user,
        );
    }

    @Put('update-ticket/:id')
    updateTicket(
        @Param() { id }: IdParamDto,
        @Body() ticketData: Partial<CreateTicketBodyDto>,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        return this.ticketService.updateTicket(id, ticketData, req.user);
    }

    @Delete('delete-ticket/:id')
    deleteTicket(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        return this.ticketService.deleteTicket(id, req.user);
    }
}
