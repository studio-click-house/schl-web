import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    CreateLeaveDto,
    UpdateLeaveDto,
    UpdateLeaveStatusDto,
} from './dto/create-leave.dto';
import {
    SearchLeavesBodyDto,
    SearchLeavesQueryDto,
} from './dto/search-leaves.dto';
import { LeaveService } from './leave.service';

@Controller('leaves')
export class LeaveController {
    constructor(private readonly service: LeaveService) {}

    @Get()
    async findAll(
        @Req() req: Request & { user: UserSession },
        @Query('employeeId') employeeId?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('isPaid') isPaid?: string,
        @Query('leaveType') leaveType?: string,
        @Query('status') status?: string,
    ) {
        const parsedIsPaid =
            isPaid === 'true' ? true : isPaid === 'false' ? false : undefined;
        return await this.service.findAll(
            employeeId,
            fromDate,
            toDate,
            parsedIsPaid,
            leaveType,
            status,
            req.user,
        );
    }

    @Post('search')
    async search(
        @Query() query: SearchLeavesQueryDto,
        @Body() body: SearchLeavesBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };
        return await this.service.searchLeaves(body, pagination, req.user);
    }

    @Post()
    async create(
        @Body() dto: CreateLeaveDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.apply(dto, req.user);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateLeaveStatusDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.updateStatus(id, dto.status, req.user);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateLeaveDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.update(id, dto, req.user);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.remove(id, req.user);
    }
}
