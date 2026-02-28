import {
    Body,
    Controller,
    Delete,
    Param,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { DailyUpdateService } from './daily-update.service';
import { CreateDailyUpdateBodyDto } from './dto/create-daily-update.dto';
import {
    SearchDailyUpdateBodyDto,
    SearchDailyUpdateQueryDto,
} from './dto/search-daily-update.dto';

@Controller('daily-update')
export class DailyUpdateController {
    constructor(private readonly dailyUpdateService: DailyUpdateService) {}

    @Post('create-daily-update')
    createDailyUpdate(
        @Body() body: CreateDailyUpdateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.createDailyUpdate(body, req.user);
    }

    @Post('search-daily-updates')
    searchDailyUpdates(
        @Query() query: SearchDailyUpdateQueryDto,
        @Body() body: SearchDailyUpdateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };

        return this.dailyUpdateService.searchDailyUpdates(
            body,
            pagination,
            req.user,
        );
    }

    @Delete('delete-daily-update/:id')
    deleteDailyUpdate(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.deleteDailyUpdate(id, req.user);
    }
}
