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
import { CreateCommitBodyDto } from './dto/create-commit.dto';
import { CreateTicketBodyDto } from './dto/create-ticket.dto';
import {
    SearchCommitLogsBodyDto,
    SearchCommitLogsQueryDto,
} from './dto/search-commit-logs.dto';
import {
    SearchTicketsBodyDto,
    SearchTicketsQueryDto,
} from './dto/search-tickets.dto';
import { UpdateCommitBodyDto } from './dto/update-commit.dto';
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

    @Get('work-log-tickets')
    getWorkLogTickets(@Req() req: Request & { user: UserSession }) {
        return this.ticketService.getWorkLogTickets(req.user);
    }

    @Put('update-ticket/:id')
    updateTicket(
        @Param() { id }: IdParamDto,
        @Body() ticketData: Partial<CreateTicketBodyDto>,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        return this.ticketService.updateTicket(id, ticketData, req.user);
    }

    @Post('add-commit/:id')
    addCommit(
        @Param() { id }: IdParamDto,
        @Body() body: CreateCommitBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.ticketService.addCommit(id, body, req.user);
    }

    @Post('search-commit-logs')
    searchCommitLogs(
        @Query() query: SearchCommitLogsQueryDto,
        @Body() body: SearchCommitLogsBodyDto,
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };
        return this.ticketService.searchCommitLogs(body, pagination);
    }

    @Put('update-commit/:id')
    updateCommit(
        @Param() { id }: IdParamDto,
        @Body() body: UpdateCommitBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.ticketService.updateCommitLog(id, body, req.user);
    }

    @Delete('delete-commit/:id')
    deleteCommit(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.ticketService.deleteCommitLog(id, req.user);
    }

    @Delete('delete-ticket/:id')
    deleteTicket(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<{ message: string }> {
        return this.ticketService.deleteTicket(id, req.user);
    }
}
