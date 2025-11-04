import {
    Body,
    Controller,
    Delete,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CreateScheduleBodyDto } from './dto/create-schedule.dto';
import {
    SearchSchedulesBodyDto,
    SearchSchedulesQueryDto,
} from './dto/search-schedules.dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    @Post('search-schedules')
    searchSchedules(
        @Query() query: SearchSchedulesQueryDto,
        @Body() body: SearchSchedulesBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.scheduleService.searchSchedules(body, pagination, req.user);
    }

    @Post('create-schedule')
    createSchedule(
        @Body() body: CreateScheduleBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.scheduleService.createSchedule(body, req.user);
    }

    @Delete('delete-schedule/:id')
    deleteSchedule(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.scheduleService.deleteSchedule(id, req.user);
    }

    @Put('update-schedule/:id')
    updateSchedule(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateScheduleBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.scheduleService.updateSchedule(id, body, req.user);
    }
}
