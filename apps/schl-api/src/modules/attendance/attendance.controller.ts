import {
    Body,
    Controller,
    Delete,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { Public } from '../../common/auth/public.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { SearchAttendanceQueryDto } from './dto/search-attendance.dto';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    @Public()
    @Post('mark-attendance')
    async markAttendance(@Body() body: MarkAttendanceDto) {
        return await this.attendanceService.markAttendance(body);
    }

    @Post('create-attendance')
    async createAttendance(
        @Body() body: CreateAttendanceBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.attendanceService.createAttendance(body, req.user);
    }

    @Put('update-attendance/:id')
    async updateAttendance(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateAttendanceBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.attendanceService.updateAttendance(
            id,
            body,
            req.user,
        );
    }

    @Delete('delete-attendance/:id')
    async deleteAttendance(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.attendanceService.deleteAttendance(id, req.user);
    }

    @Post('search-attendance')
    async searchAttendance(
        @Query() query: SearchAttendanceQueryDto,
        @Body() body: { employeeId: string },
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };
        return await this.attendanceService.searchAttendance(
            body.employeeId,
            pagination,
            req.user,
        );
    }
}
