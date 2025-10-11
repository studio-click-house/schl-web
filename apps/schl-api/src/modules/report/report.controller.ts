import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { IdParamDto } from 'src/common/dto/id-param.dto';
import { UserSession } from 'src/common/types/user-session.type';
import { ConvertToClientBodyDto } from './dto/convert-to-client.dto';
import { CreateReportBodyDto } from './dto/create-report.dto';
import {
    ReportStatusesByNameQueryDto,
    ReportStatusesQueryDto,
} from './dto/reports-status.dto';
import {
    SearchReportsBodyDto,
    SearchReportsQueryDto,
} from './dto/search-reports.dto';
import { ReportService } from './services/report.service';

@Controller('report')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get('call-reports-trend')
    callReportsTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.callReportsTrend(req.user);
    }

    @Get('call-reports-trend/:name')
    callReportsTrendByName(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string,
    ) {
        return this.reportService.callReportsTrend(req.user, name);
    }

    @Get('clients-onboard-trend')
    clientsOnboardTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.clientsOnboardTrend(req.user);
    }

    @Get('clients-onboard-trend/:name')
    clientsOnboardTrendByName(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string,
    ) {
        return this.reportService.clientsOnboardTrend(req.user, name);
    }

    @Get('test-orders-trend')
    testOrdersTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.testOrdersTrend(req.user);
    }

    @Get('test-orders-trend/:name')
    testOrdersTrendByName(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string,
    ) {
        return this.reportService.testOrdersTrend(req.user, name);
    }

    @Get('report-statuses')
    reportStatuses(
        @Req() req: Request & { user: UserSession },
        @Query() query: ReportStatusesQueryDto,
    ) {
        return this.reportService.reportStatuses(
            req.user,
            query.fromDate,
            query.toDate,
        );
    }

    @Get('report-statuses/:name')
    async reportStatusesByName(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
        @Query() query: ReportStatusesByNameQueryDto,
    ) {
        const map = await this.reportService.reportStatuses(
            req.user,
            query.fromDate,
            query.toDate,
            name,
        );
        const key = (name || '').trim();
        return (
            map[key] || {
                totalCalls: 0,
                totalLeads: 0,
                totalClients: 0,
                totalTests: 0,
                totalProspects: 0,
            }
        );
    }

    @Post('search-reports')
    searchReports(
        @Query() query: SearchReportsQueryDto,
        @Body() body: SearchReportsBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.reportService.searchReports(body, pagination, req.user);
    }

    @Post('search-reports/:name')
    searchReportsByName(
        @Param('name') name: string, // marketer's company given name
        @Query() query: SearchReportsQueryDto,
        @Body() body: SearchReportsBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        if (!body.marketerName) body.marketerName = name.trim();

        return this.reportService.searchReports(body, pagination, req.user);
    }

    @Post('convert-to-client')
    convertToClient(
        @Req() req: Request & { user: UserSession },
        @Body() body: ConvertToClientBodyDto,
    ) {
        return this.reportService.convertToClient(req.user, body);
    }

    @Post('reject-client-request/:id')
    rejectClientRequest(
        @Req() req: Request & { user: UserSession },
        @Param() { id }: IdParamDto,
    ) {
        return this.reportService.rejectClientRequest(req.user, id);
    }

    @Post('mark-duplicate-client-request/:id')
    markDuplicateClientRequest(
        @Req() req: Request & { user: UserSession },
        @Param() { id }: IdParamDto,
    ) {
        return this.reportService.markDuplicateClientRequest(req.user, id);
    }

    @Get('followup-count-for-today/:name')
    followupCountForToday(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ) {
        return this.reportService.followupCountForToday(req.user, name);
    }

    @Get('recall-count/:name')
    recallCount(
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ) {
        return this.reportService.recallCount(req.user, name);
    }

    @Post('create-report')
    createReport(
        @Req() req: Request & { user: UserSession },
        @Body() reportData: CreateReportBodyDto,
    ) {
        return this.reportService.createReport(req.user, reportData);
    }

    @Put('update-report/:id')
    updateReport(
        @Param() { id }: IdParamDto,
        @Body() reportData: Partial<CreateReportBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.reportService.updateReport(id, reportData, req.user);
    }

    @Post('withdraw-lead/:id/:name')
    withdrawLead(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's real name, who is requesting the withdrawal
    ): Promise<any> {
        return this.reportService.withdrawLead(id, req.user, name);
    }

    @Post('done-followup/:id/:name')
    doneFollowup(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ): Promise<any> {
        return this.reportService.doneFollowup(id, req.user, name);
    }

    @Get('get-report/:id')
    getReport(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return this.reportService.getReport(id, req.user);
    }

    @Post('remove-client-from-report/:id/:name')
    removeClientFromReport(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ): Promise<any> {
        return this.reportService.removeClientFromReport(id, req.user, name);
    }
}
