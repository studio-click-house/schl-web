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
import { CreateWorkUpdateBodyDto } from './dto/create-work-update.dto';
import {
    SearchWorkUpdateBodyDto,
    SearchWorkUpdateQueryDto,
} from './dto/search-work-update.dto';
import { WorkUpdateService } from './work-update.service';

@Controller('work-update')
export class WorkUpdateController {
    constructor(private readonly dailyUpdateService: WorkUpdateService) {}

    @Post('create-work-update')
    createWorkUpdate(
        @Body() body: CreateWorkUpdateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.createWorkUpdate(body, req.user);
    }

    @Post('search-work-updates')
    searchWorkUpdates(
        @Query() query: SearchWorkUpdateQueryDto,
        @Body() body: SearchWorkUpdateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };

        return this.dailyUpdateService.searchWorkUpdates(
            body,
            pagination,
            req.user,
        );
    }

    @Delete('delete-work-update/:id')
    deleteWorkUpdate(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.deleteWorkUpdate(id, req.user);
    }
}
