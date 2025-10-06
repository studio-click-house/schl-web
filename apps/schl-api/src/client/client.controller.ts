import { Body, Controller, Param, Post, Put, Query, Req } from '@nestjs/common';
import { UserSession } from 'src/common/types/user-session.type';
import { ClientService } from './client.service';
import { CreateClientBodyDto } from './dto/create-client.dto';
import {
    SearchClientsBodyDto,
    SearchClientsQueryDto,
} from './dto/search-clients.dto';

@Controller('client')
export class ClientController {
    constructor(private readonly clientService: ClientService) {}

    @Post('search-clients')
    async searchClients(
        @Query() query: SearchClientsQueryDto,
        @Body() body: SearchClientsBodyDto,
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.clientService.searchClients(body, pagination);
    }

    @Post('create-client')
    createRole(
        @Body() body: CreateClientBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.clientService.createClient(body, req.user);
    }

    @Put('update-client/:id')
    updateClient(
        @Param('id') clientId: string,
        @Body() clientData: Partial<CreateClientBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.clientService.updateClient(clientId, clientData, req.user);
    }
}
