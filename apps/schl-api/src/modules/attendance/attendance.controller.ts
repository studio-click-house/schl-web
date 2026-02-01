import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/common/auth/public.decorator';
import { AttendanceService } from './attendance.service';
import { MarkEmployeeDto } from './dto/mark-employee.dto';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    @Public()
    @Post('mark')
    async markAttendance(@Body() body: MarkEmployeeDto) {
        return await this.attendanceService.markAttendance(body);
    }
}
