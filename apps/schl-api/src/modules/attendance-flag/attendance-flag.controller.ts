import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { AttendanceFlagService } from './attendance-flag.service';
import {
    CreateAttendanceFlagDto,
    UpdateAttendanceFlagDto,
} from './dto/create-attendance-flag.dto';

@Controller('attendance-flags')
export class AttendanceFlagController {
    constructor(private readonly service: AttendanceFlagService) {}

    @Get()
    async findAll() {
        return await this.service.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.service.findOne(id);
    }

    @Post()
    async create(
        @Body() dto: CreateAttendanceFlagDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.create(dto, req.user);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateAttendanceFlagDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.update(id, dto, req.user);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.delete(id, req.user);
    }
}
