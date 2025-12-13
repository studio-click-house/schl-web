import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { AvailableFoldersQueryDto } from './dto/available-folders.dto';
import { AvailableOrdersQueryDto } from './dto/available-orders.dto';
import { FileActionDto } from './dto/file-action.dto';
import { ListFilesQueryDto } from './dto/list-files.dto';
import { NewJobBodyDto } from './dto/new-job.dto';
import { SearchJobsBodyDto, SearchJobsQueryDto } from './dto/search-jobs.dto';
import { TransferFileDto } from './dto/transfer-file.dto';
import { JobService } from './job.service';

@Controller('job')
export class JobController {
    constructor(private readonly jobService: JobService) {}

    @Post('new-job')
    newJob(
        @Req() req: Request & { user: UserSession },
        @Body() body: NewJobBodyDto,
    ) {
        return this.jobService.newJob(body, req.user);
    }

    @Get('available-orders')
    availableOrders(
        @Req() req: Request & { user: UserSession },
        @Query() { jobType, clientCode }: AvailableOrdersQueryDto,
    ) {
        return this.jobService.availableOrders(jobType, req.user, clientCode);
    }

    @Get('available-folders')
    availableFolders(
        @Req() req: Request & { user: UserSession },
        @Query() { jobType, clientCode }: AvailableFoldersQueryDto,
    ) {
        return this.jobService.availableFolders(jobType, req.user, clientCode);
    }

    @Get('available-files')
    availableFiles(
        @Req() req: Request & { user: UserSession },
        @Query()
        { folderPath, jobType, fileCondition, qcStep }: ListFilesQueryDto,
    ) {
        return this.jobService.availableFiles(
            folderPath,
            jobType,
            fileCondition,
            req.user,
            qcStep,
        );
    }

    @Post('search-jobs')
    searchJobs(
        @Req() req: Request & { user: UserSession },
        @Query() query: SearchJobsQueryDto,
        @Body() body: SearchJobsBodyDto,
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.jobService.searchJobs(body, pagination, req.user);
    }

    @Post('resume')
    resumeFile(
        @Req() req: Request & { user: UserSession },
        @Body() body: FileActionDto,
    ) {
        return this.jobService.resumeFile(body, req.user);
    }

    @Post('pause')
    pauseFile(
        @Req() req: Request & { user: UserSession },
        @Body() body: FileActionDto,
    ) {
        return this.jobService.pauseFile(body, req.user);
    }

    @Post('finish')
    finishFile(
        @Req() req: Request & { user: UserSession },
        @Body() body: FileActionDto,
    ) {
        return this.jobService.finishFile(body, req.user);
    }

    @Post('cancel')
    cancelFile(
        @Req() req: Request & { user: UserSession },
        @Body() body: FileActionDto,
    ) {
        return this.jobService.cancelFile(body, req.user);
    }

    @Post('transfer')
    transferFile(
        @Req() req: Request & { user: UserSession },
        @Body() body: TransferFileDto,
    ) {
        return this.jobService.transferFile(body, req.user);
    }
}
