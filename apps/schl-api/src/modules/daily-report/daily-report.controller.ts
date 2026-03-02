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
import { DailyReportService } from './daily-report.service';
import { CreateDailyReportBodyDto } from './dto/create-daily-report.dto';
import {
    SearchDailyReportBodyDto,
    SearchDailyReportQueryDto,
} from './dto/search-daily-report.dto';

@Controller('daily-report')
export class DailyReportController {
    constructor(private readonly dailyUpdateService: DailyReportService) {}

    @Post('create-daily-report')
    createDailyReport(
        @Body() body: CreateDailyReportBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.createDailyReport(body, req.user);
    }

    @Post('search-daily-reports')
    searchDailyReports(
        @Query() query: SearchDailyReportQueryDto,
        @Body() body: SearchDailyReportBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };

        return this.dailyUpdateService.searchDailyReports(
            body,
            pagination,
            req.user,
        );
    }

    @Delete('delete-daily-report/:id')
    deleteDailyReport(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.deleteDailyReport(id, req.user);
    }

    @Post('verify-daily-report/:id')
    verifyDailyReport(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.dailyUpdateService.verifyDailyReport(id, req.user);
    }
}
