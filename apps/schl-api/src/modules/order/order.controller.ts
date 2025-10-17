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
import { IdParamDto } from 'src/common/dto/id-param.dto';
import { UserSession } from 'src/common/types/user-session.type';
import { ClientOrdersParamDto } from './dto/client-orders.dto';
import { CreateOrderBodyDto } from './dto/create-order.dto';
import {
    SearchOrdersBodyDto,
    SearchOrdersQueryDto,
} from './dto/search-orders.dto';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post('search-orders')
    searchOrders(
        @Query() query: SearchOrdersQueryDto,
        @Body() body: SearchOrdersBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.orderService.searchOrders(body, pagination, req.user);
    }

    @Get('client-orders/:code')
    getClientOrders(
        @Param() { code }: ClientOrdersParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.clientOrders(code, req.user);
    }

    @Post('create')
    createOrder(
        @Body() body: CreateOrderBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.createOrder(body, req.user);
    }

    @Delete('delete/:id')
    deleteOrder(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.deleteOrder(id, req.user);
    }

    @Post('finish-order/:id')
    finishOrder(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.finishOrder(id, req.user);
    }

    @Post('redo-order/:id')
    redoOrder(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.redoOrder(id, req.user);
    }

    @Put('update-order/:id')
    updateOrder(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateOrderBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.updateOrder(id, body, req.user);
    }
}
