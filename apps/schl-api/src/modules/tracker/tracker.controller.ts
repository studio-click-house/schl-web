import { Body, Controller, Post } from '@nestjs/common';
import {
    CheckUserDto,
    LoginTrackerDto,
    LogoutTrackerDto,
    SetPasswordDto,
} from './dto/auth.dto';
import { JobListDto } from './dto/job-list.dto';
import { ReportFileDto } from './dto/report-file.dto';
import { SearchFileDto } from './dto/search-file.dto';
import { DashboardTodayDto } from './dto/dashboard-today.dto';
import { WorkLogDto } from './dto/work-log.dto';
import { LiveTrackingDataDto } from './dto/live-tracking-data.dto';
import { PauseDto } from './dto/pause.dto';
import { TrackerAuthService } from './services/auth.service';
import { TrackerPauseService } from './services/pause.service';
import { TrackerWorkLogService } from './services/work-log.service';
import { TrackerQueryService } from './services/query.service';
import { TrackerReportService } from './services/report.service';

@Controller('tracker')
export class TrackerController {
    constructor(
        private readonly authService: TrackerAuthService,
        private readonly pauseService: TrackerPauseService,
        private readonly workLogService: TrackerWorkLogService,
        private readonly queryService: TrackerQueryService,
        private readonly reportService: TrackerReportService,
    ) {}

    @Post('check-user')
    checkUser(@Body() dto: CheckUserDto) {
        return this.authService.checkUser(dto.username);
    }

    @Post('login')
    login(@Body() dto: LoginTrackerDto) {
        return this.authService.login(dto);
    }

    @Post('logout')
    logout(@Body() dto: LogoutTrackerDto) {
        return this.authService.logout(dto.sessionId);
    }

    @Post('set-password')
    setPassword(@Body() dto: SetPasswordDto) {
        return this.authService.setPassword(dto.username, dto.password);
    }

    @Post('sync-work-log')
    syncWorkLog(@Body() dto: WorkLogDto) {
        return this.workLogService.sync(dto);
    }

    @Post('pause')
    syncPause(@Body() dto: PauseDto) {
        return this.pauseService.syncPause(dto);
    }

    @Post('report-file')
    reportFile(@Body() dto: ReportFileDto) {
        return this.reportService.reportFile(dto);
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

    @Post('live-tracking-data')
    liveTrackingData(@Body() dto: LiveTrackingDataDto) {
        return this.queryService.liveTrackingData(dto);
    }
}
