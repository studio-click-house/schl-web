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
import { Public } from '../../common/auth/public.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AttendanceService } from './attendance.service';
import {
    GetAttendanceWithOTDto,
    GetEmployeeAttendanceSummaryDto,
} from './dto/attendance-report.dto';
import { CreateAttendanceBodyDto } from './dto/create-attendance.dto';
import { MarkEmployeeDto } from './dto/mark-employee.dto';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    @Public()
    @Post('mark-attendance')
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

    // ==================== OVERTIME & REPORTING ENDPOINTS ====================

    @Post('with-overtime')
    async getAttendanceWithOT(@Body() body: GetAttendanceWithOTDto) {
        return await this.attendanceService.getAttendanceWithOT(body);
    }

    @Post('summary')
    async getEmployeeAttendanceSummary(
        @Body() body: GetEmployeeAttendanceSummaryDto,
    ) {
        return await this.attendanceService.getEmployeeAttendanceSummary(body);
    }

    @Get('records')
    async getAttendanceRecords(
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string,
        @Query('employeeId') employeeId?: string,
    ) {
        return await this.attendanceService.getAttendanceRecords(
            new Date(fromDate),
            new Date(toDate),
            employeeId,
        );
    }
}
