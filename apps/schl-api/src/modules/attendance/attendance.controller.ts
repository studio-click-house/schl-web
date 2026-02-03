import {
    Body,
    Controller,
    Delete,
    Param,
    Post,
    Put,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { Public } from '../../common/auth/public.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkEmployeeDto } from './dto/mark-employee.dto';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    @Public()
    @Post('mark')
    async markAttendance(@Body() body: MarkEmployeeDto) {
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
}
