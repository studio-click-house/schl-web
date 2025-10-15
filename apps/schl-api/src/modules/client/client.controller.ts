import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { IdParamDto } from 'src/common/dto/id-param.dto';
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
    searchClients(
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
    createClient(
        @Body() body: CreateClientBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.clientService.createClient(body, req.user);
    }

    @Put('update-client/:id')
    updateClient(
        @Param() { id }: IdParamDto,
        @Body() clientData: Partial<CreateClientBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.clientService.updateClient(id, clientData, req.user);
    }

    @Get('get-client/:param')
    getClient(
        @Param('param') param: string,
        @Req() req: Request & { user: UserSession },
    ) {
        const value = param.trim();
        const isPotentialObjectId =
            value.length === 24 && /^[0-9a-fA-F]{24}$/.test(value);
        if (isPotentialObjectId) {
            return this.clientService.getClientById(value, req.user);
        }
        return this.clientService.getClientByCode(
            value.toUpperCase(),
            req.user,
        );
    }
}
