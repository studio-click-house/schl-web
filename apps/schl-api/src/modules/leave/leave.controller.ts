import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateLeaveDto, UpdateLeaveStatusDto } from './dto/create-leave.dto';
import { LeaveService } from './leave.service';

@Controller('leaves')
export class LeaveController {
    constructor(private readonly service: LeaveService) {}

    @Get()
    async findAll(
        @Query('employeeId') employeeId: string,
        @Query('status') status: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.findAll(employeeId, status, req.user);
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
}
