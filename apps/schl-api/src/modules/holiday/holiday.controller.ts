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
    CheckEmployeeHolidayDto,
    CreateHolidayDto,
    GetHolidaysQueryDto,
    UpdateHolidayDto,
} from './dto/holiday.dto';
import { HolidayService } from './holiday.service';

@Controller('holiday')
export class HolidayController {
    constructor(private readonly holidayService: HolidayService) {}

    @Post('create')
    async createHoliday(
        @Body() body: CreateHolidayDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.holidayService.createHoliday(body, req.user);
    }

    @Put('update/:id')
    async updateHoliday(
        @Param() { id }: IdParamDto,
        @Body() body: UpdateHolidayDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.holidayService.updateHoliday(id, body, req.user);
    }

    @Get('list')
    async getHolidays(@Query() query: GetHolidaysQueryDto) {
        return await this.holidayService.getHolidays(query);
    }

    @Get('detail/:id')
    async getHolidayById(@Param() { id }: IdParamDto) {
        return await this.holidayService.getHolidayById(id);
    }

    @Delete('delete/:id')
    async deleteHoliday(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.holidayService.deleteHoliday(id, req.user);
    }

    @Post('check-employee')
    async checkEmployeeHoliday(@Body() body: CheckEmployeeHolidayDto) {
        const holiday = await this.holidayService.checkEmployeeHoliday(body);
        return {
            hasHoliday: !!holiday,
            holiday,
        };
    }

    @Get('affected-employees/:id')
    async getAffectedEmployees(@Param() { id }: IdParamDto) {
        return await this.holidayService.getAffectedEmployees(id);
    }

    @Get('employee/:id/upcoming')
    async getEmployeeUpcomingHolidays(
        @Param() { id }: IdParamDto,
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string,
    ) {
        return await this.holidayService.getEmployeeUpcomingHolidays(
            id,
            new Date(fromDate),
            new Date(toDate),
        );
    }
}
