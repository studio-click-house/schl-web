import { Body, Controller, Post, Req } from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { DailyUpdateService } from './daily-update.service';
import { CreateDailyUpdateBodyDto } from './dto/create-daily-update.dto';

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
}
