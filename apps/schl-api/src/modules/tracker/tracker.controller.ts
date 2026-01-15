import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { CheckUserDto } from './dto/check-user.dto';
import { LoginTrackerDto, SetPasswordDto } from './dto/login-tracker.dto';
import { SyncWorkLogDto } from './dto/sync-work-log.dto';
import { TrackerService } from './tracker.service';

@Controller('tracker')
export class TrackerController {
    constructor(private readonly trackerService: TrackerService) { }

    @Public()
    @Post('check-user')
    checkUser(@Body() dto: CheckUserDto) {
        return this.trackerService.checkUser(dto.username);
    }

    @Public()
    @Post('login')
    login(@Body() dto: LoginTrackerDto) {
        return this.trackerService.login(dto);
    }

    @Public()
    @Post('set-password')
    setPassword(@Body() dto: SetPasswordDto) {
        return this.trackerService.setPassword(dto.username, dto.password);
    }

    @Public()
    @Post('sync')
    sync(@Body() dto: SyncWorkLogDto) {
        return this.trackerService.sync(dto);
    }

    @Public()
    @Post('resolve-order')
    resolveOrder(@Body() body: { folder_path: string }) {
        return this.trackerService.resolveOrder(body.folder_path);
    }
}
