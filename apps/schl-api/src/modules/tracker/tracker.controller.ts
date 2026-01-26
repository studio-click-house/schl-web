import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { CheckUserDto } from './dto/check-user.dto';
import { LoginTrackerDto, SetPasswordDto } from './dto/login-tracker.dto';
import { ResolveOrderDto } from './dto/resolve-order.dto';
import { SyncWorkLogDto } from './dto/sync-work-log.dto';
import { TrackerService } from './tracker.service';

@Public()
@Controller('tracker')
export class TrackerController {
    constructor(private readonly trackerService: TrackerService) {}

    @Post('check-user')
    checkUser(@Body() dto: CheckUserDto) {
        return this.trackerService.checkUser(dto.username);
    }

    @Post('login')
    login(@Body() dto: LoginTrackerDto) {
        return this.trackerService.login(dto);
    }

    @Post('set-password')
    setPassword(@Body() dto: SetPasswordDto) {
        return this.trackerService.setPassword(dto.username, dto.password);
    }

    @Post('sync')
    sync(@Body() dto: SyncWorkLogDto) {
        return this.trackerService.sync(dto);
    }

    @Post('resolve-order')
    resolveOrder(@Body() dto: ResolveOrderDto) {
        return this.trackerService.resolveOrder(dto);
    }
}
