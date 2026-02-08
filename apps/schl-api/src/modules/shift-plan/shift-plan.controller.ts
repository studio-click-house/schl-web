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
import { CreateShiftOverrideBodyDto } from './dto/create-shift-override.dto';
import { CreateShiftTemplateBodyDto } from './dto/create-shift-template.dto';
import {
    SearchShiftPlansBodyDto,
    SearchShiftPlansQueryDto,
} from './dto/search-shift-plan.dto';
import { UpdateShiftTemplateBodyDto } from './dto/update-shift-template.dto';
import { ShiftPlanService } from './shift-plan.service';

@Controller('shift-plan')
export class ShiftPlanController {
    constructor(private readonly shiftPlanService: ShiftPlanService) {}

    @Post('overrides/search')
    async searchOverrides(
        @Body() body: SearchShiftPlansBodyDto,
        @Query() query: SearchShiftPlansQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.searchOverrides(
            body,
            {
                page: query.page ? Number(query.page) : 1,
                itemsPerPage: query.itemsPerPage
                    ? Number(query.itemsPerPage)
                    : 10,
                paginated:
                    query.paginated !== undefined
                        ? String(query.paginated) === 'true'
                        : true,
            },
            req.user,
        );
    }

    @Delete('overrides/:id')
    async deleteOverride(
        @Param('id') id: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.deleteOverride(id, req.user);
    }

    @Post('create')
    async createShiftPlan(
        @Body() body: CreateShiftOverrideBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.createShiftPlan(body, req.user);
    }

    @Post('create-bulk')
    async createBulkShiftPlans(
        @Body() body: CreateShiftTemplateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.createBulkShiftPlans(body, req.user);
    }

    @Get(':id')
    async getShiftPlan(@Param() { id }: IdParamDto) {
        return await this.shiftPlanService.getShiftPlan(id);
    }

    @Get('by-employee/:employeeId')
    async getEmployeeShiftPlans(
        @Param('employeeId') employeeId: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return await this.shiftPlanService.getEmployeeShiftPlans(
            employeeId,
            fromDate,
            toDate,
        );
    }

    @Put(':id')
    async updateShiftPlan(
        @Param() { id }: IdParamDto,
        @Body() body: UpdateShiftTemplateBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.updateShiftPlan(id, body, req.user);
    }

    @Post('search')
    async searchShiftPlans(
        @Body() body: SearchShiftPlansBodyDto,
        @Query() query: SearchShiftPlansQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const page = parseInt(query.page || '1', 10);
        const itemsPerPage = parseInt(query.itemsPerPage || '30', 10);
        const paginated = query.paginated !== 'false';

        return await this.shiftPlanService.searchShiftPlans(
            body,
            { page, itemsPerPage, paginated },
            req.user,
        );
    }
}
