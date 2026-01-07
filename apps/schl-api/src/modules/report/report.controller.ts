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
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { ConvertToClientBodyDto } from './dto/convert-to-client.dto';
import { MarkDuplicateClientRequestBodyDto } from './dto/mark-duplicate-client-request.dto';
import { CreateReportBodyDto } from './dto/create-report.dto';
import { ReportStatusesQueryDto } from './dto/reports-status.dto';
import {
    SearchReportsBodyDto,
    SearchReportsQueryDto,
} from './dto/search-reports.dto';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get('call-reports-trend')
    callReportsTrend(
        @Req() req: Request & { user: UserSession },
        @Query('name') name: string,
    ) {
        return this.reportService.callReportsTrend(req.user, name);
    }

    @Get('clients-onboard-trend')
    clientsOnboardTrend(
        @Req() req: Request & { user: UserSession },
        @Query('name') name: string,
    ) {
        return this.reportService.clientsOnboardTrend(req.user, name);
    }
    @Get('test-orders-trend')
    testOrdersTrend(
        @Req() req: Request & { user: UserSession },
        @Query('name') name: string,
    ) {
        return this.reportService.testOrdersTrend(req.user, name);
    }

    @Get(['report-statuses', 'report-statuses/:name'])
    async reportStatuses(
        @Query() query: ReportStatusesQueryDto,
        @Req() req: Request & { user: UserSession },
        @Param('name') name?: string, // marketer's company given name
    ) {
        const map = await this.reportService.reportStatuses(
            req.user,
            query.fromDate,
            query.toDate,
            name,
        );

        if (name) {
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
        return map;
    }

    @Post('search-reports')
    searchReports(
        @Query() query: SearchReportsQueryDto,
        @Body() body: SearchReportsBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        console.log('body', body);

        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
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
            // filtered: query.filtered,
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
        @Body() body: MarkDuplicateClientRequestBodyDto,
    ) {
        return this.reportService.markDuplicateClientRequest(
            req.user,
            id,
            body.clientCode,
        );
    }

    @Get('followup-count-for-today')
    followupCountForToday(
        @Req() req: Request & { user: UserSession },
        @Query('marketer') name: string, // marketer's company given name
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
        @Param('id') id: IdParamDto['id'],
        @Body() reportData: Partial<CreateReportBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.reportService.updateReport(id, reportData, req.user);
    }

    @Post('withdraw-lead/:id')
    withdrawLead(
        @Param('id') id: IdParamDto['id'],
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return this.reportService.withdrawLead(id, req.user);
    }

    @Post('done-followup/:id/:name')
    doneFollowup(
        @Param('id') id: IdParamDto['id'],
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ): Promise<any> {
        return this.reportService.doneFollowup(id, req.user, name);
    }

    @Get('get-report/:id')
    getReport(
        @Param('id') id: IdParamDto['id'],
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return this.reportService.getReport(id, req.user);
    }

    @Post('remove-client-from-report/:id/:name')
    removeClientFromReport(
        @Param('id') id: IdParamDto['id'],
        @Req() req: Request & { user: UserSession },
        @Param('name') name: string, // marketer's company given name
    ): Promise<any> {
        return this.reportService.removeClientFromReport(id, req.user, name);
    }
}
