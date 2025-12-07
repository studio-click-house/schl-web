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
import {
    ClientCodeParamDto,
    ClientCodeRequiredParamDto,
} from '../../common/dto/client-code-param.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CreateOrderBodyDto } from './dto/create-order.dto';
import {
    OrdersByCountryParamDto,
    OrdersByCountryQueryDto,
} from './dto/orders-by-country.dto';
import { OrdersByMonthQueryDto } from './dto/orders-by-month.dto';
import { OrdersCDQueryDto } from './dto/orders-cd.dto';
import { OrdersQPQueryDto } from './dto/orders-qp.dto';
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
            // filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.orderService.searchOrders(body, pagination, req.user);
    }

    @Get('client-orders/:code')
    getClientOrders(
        @Param() { code }: ClientCodeRequiredParamDto,
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

    @Get(['orders-by-month', 'orders-by-month/:code'])
    ordersByMonth(
        @Query() query: OrdersByMonthQueryDto,
        @Param() { code }: ClientCodeParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
        };

        return this.orderService.ordersByMonth(code, pagination, req.user);
    }

    @Get('orders-by-country/:country')
    ordersByCountry(
        @Query() query: OrdersByCountryQueryDto,
        @Param() { country }: OrdersByCountryParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.ordersByCountry(country, query, req.user);
    }

    @Get('orders-cd')
    ordersCD(
        @Query() query: OrdersCDQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.ordersCD(query, req.user);
    }

    @Get('orders-qp')
    ordersQP(
        @Query() query: OrdersQPQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.ordersQP(query, req.user);
    }

    @Get('unfinished-orders')
    unfinishedOrders(@Req() req: Request & { user: UserSession }) {
        return this.orderService.unfinishedOrders(req.user);
    }

    @Get('qc-orders')
    qcOrders(@Req() req: Request & { user: UserSession }) {
        return this.orderService.qcOrders(req.user);
    }

    @Get('rework-orders')
    reworkOrders(@Req() req: Request & { user: UserSession }) {
        return this.orderService.reworkOrders(req.user);
    }

    @Get(':id')
    getOrder(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.orderService.getOrder(id, req.user);
    }
}
