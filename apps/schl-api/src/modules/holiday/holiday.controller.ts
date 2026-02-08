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
    UseGuards,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/create-holiday.dto';
import { HolidayService } from './holiday.service';

@Controller('holidays')
export class HolidayController {
    constructor(private readonly service: HolidayService) {}

    @Get()
    async findAll(@Query('year') year?: string) {
        return await this.service.findAll(year ? parseInt(year) : undefined);
    }

    @Post()
    async create(
        @Body() dto: CreateHolidayDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.service.create(dto, req.user);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateHolidayDto,
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
