import { Controller, Get, Req } from '@nestjs/common';
import { UserSession } from 'src/common/types/user-session.type';
import { ReportService } from './services/report/report.service';

@Controller('report')
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get('call-reports-trend')
    getCallReportsTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.getCallReportsTrend(req.user);
    }

    @Get('clients-onboard-trend')
    getClientsOnboardTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.getClientsOnboardTrend(req.user);
    }

    @Get('test-orders-trend')
    getTestOrdersTrend(@Req() req: Request & { user: UserSession }) {
        return this.reportService.getTestOrdersTrend(req.user);
    }
}
