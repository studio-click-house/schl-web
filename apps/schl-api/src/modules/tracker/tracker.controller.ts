import { Body, Controller, Post } from '@nestjs/common';
import { CheckUserDto, LoginTrackerDto, SetPasswordDto } from './dto/auth.dto';
import { JobListDto } from './dto/job-list.dto';
import { ReportFileDto } from './dto/report-file.dto';
import { SearchFileDto } from './dto/search-file.dto';
import { DashboardTodayDto } from './dto/dashboard-today.dto';
import { SyncQcWorkLogDto } from './dto/sync-qc-work-log.dto';
import { TrackerAuthService } from './tracker.auth.service';
import { TrackerQcWorkLogService } from './tracker.qc-work-log.service';
import { TrackerQueryService } from './tracker.query.service';

@Controller('tracker')
export class TrackerController {
    constructor(
        private readonly authService: TrackerAuthService,
        private readonly qcWorkLogService: TrackerQcWorkLogService,
        private readonly queryService: TrackerQueryService,
    ) {}

    @Post('check-user')
    checkUser(@Body() dto: CheckUserDto) {
        return this.authService.checkUser(dto.username);
    }

    @Post('login')
    login(@Body() dto: LoginTrackerDto) {
        return this.authService.login(dto);
    }

    @Post('set-password')
    setPassword(@Body() dto: SetPasswordDto) {
        return this.authService.setPassword(dto.username, dto.password);
    }

    @Post('sync-qc')
    syncQc(@Body() dto: SyncQcWorkLogDto) {
        return this.qcWorkLogService.syncQc(dto);
    }

    @Post('report-file')
    reportFile(@Body() dto: ReportFileDto) {
        return this.qcWorkLogService.reportFile(dto);
    }

    @Post('job-list')
    jobList(@Body() dto: JobListDto) {
        return this.queryService.jobList(dto);
    }

    @Post('search-file')
    searchFile(@Body() dto: SearchFileDto) {
        return this.queryService.searchFile(dto);
    }

    @Post('dashboard-today')
    dashboardToday(@Body() dto: DashboardTodayDto) {
        return this.queryService.dashboardToday(dto);
    }
}
