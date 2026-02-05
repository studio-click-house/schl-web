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
import {
    AssignEmployeeShiftDto,
    BulkAssignShiftDto,
    GetShiftScheduleDto,
} from './dto/shift-schedule.dto';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { ShiftService } from './shift.service';

@Controller('shift')
export class ShiftController {
    constructor(private readonly shiftService: ShiftService) {}

    // ==================== SHIFT ENDPOINTS ====================

    @Post('create')
    async createShift(
        @Body() body: CreateShiftDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.createShift(body, req.user);
    }

    @Put('update/:id')
    async updateShift(
        @Param() { id }: IdParamDto,
        @Body() body: UpdateShiftDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.updateShift(id, body, req.user);
    }

    @Get('list')
    async getAllShifts() {
        return await this.shiftService.getAllShifts();
    }

    @Get('detail/:id')
    async getShiftById(@Param() { id }: IdParamDto) {
        return await this.shiftService.getShiftById(id);
    }

    @Delete('delete/:id')
    async deleteShift(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.deleteShift(id, req.user);
    }

    // ==================== EMPLOYEE SHIFT SCHEDULE ENDPOINTS ====================

    @Post('schedule/assign')
    async assignEmployeeShift(
        @Body() body: AssignEmployeeShiftDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.assignEmployeeShift(body, req.user);
    }

    @Post('schedule/bulk-assign')
    async bulkAssignShift(
        @Body() body: BulkAssignShiftDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.bulkAssignShift(body, req.user);
    }

    @Get('schedule/list')
    async getShiftSchedules(@Query() query: GetShiftScheduleDto) {
        return await this.shiftService.getShiftSchedules(query);
    }

    @Get('schedule/employee/:id')
    async getEmployeeCurrentShift(@Param() { id }: IdParamDto) {
        return await this.shiftService.getEmployeeCurrentShift(id);
    }

    @Get('schedule/by-shift')
    async getEmployeesByShift(
        @Query('shiftType') shiftType: string,
        @Query('weekStart') weekStart: string,
    ) {
        return await this.shiftService.getEmployeesByShift(
            shiftType,
            new Date(weekStart),
        );
    }

    @Delete('schedule/delete/:id')
    async deleteShiftSchedule(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftService.deleteShiftSchedule(id, req.user);
    }
}
