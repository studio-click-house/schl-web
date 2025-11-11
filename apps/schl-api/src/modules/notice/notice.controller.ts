import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CreateNoticeBodyDto } from './dto/create-notice.dto';
import {
    SearchNoticesBodyDto,
    SearchNoticesQueryDto,
} from './dto/search-notices.dto';
import { NoticeService } from './notice.service';

@Controller('notice')
export class NoticeController {
    constructor(private readonly noticeService: NoticeService) {}

    @Post('create-notice')
    createNotice(
        @Body() noticeData: CreateNoticeBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.noticeService.createNotice(noticeData, req.user);
    }

    @Get('get-notice/:id')
    getNoticeById(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.noticeService.getNoticeById(id, req.user);
    }

    @Get('get-notice')
    getNoticeByNoticeNo(
        @Req() req: Request & { user: UserSession },
        @Query() query: { noticeNo: string },
    ) {
        return this.noticeService.getNoticeByNoticeNo(query.noticeNo, req.user);
    }

    @Delete('delete-notice/:id')
    deleteNotice(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.noticeService.deleteNotice(id, req.user);
    }

    @Post('search-notices')
    searchNotices(
        @Query() query: SearchNoticesQueryDto,
        @Body() body: SearchNoticesBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.noticeService.searchNotices(body, pagination, req.user);
    }

    @Put('update-notice/:id')
    updateNotice(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateNoticeBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.noticeService.updateNotice(id, body, req.user);
    }
}
