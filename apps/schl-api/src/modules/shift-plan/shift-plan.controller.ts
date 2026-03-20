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
import { BulkDeactivateShiftPlansBodyDto } from './dto/bulk-deactivate-shift-plans.dto';
import { CreateShiftAdjustmentBodyDto } from './dto/create-shift-adjustment.dto';
import { CreateBulkShiftPlanBodyDto } from './dto/create-bulk-shift-plan.dto';
import {
    SearchShiftPlanBodyDto,
    SearchShiftPlanQueryDto,
} from './dto/search-shift-plan.dto';
import { UpdateShiftPlanBodyDto } from './dto/update-shift-plan.dto';
import { ShiftPlanService } from './shift-plan.service';

@Controller('shift-plan')
export class ShiftPlanController {
    constructor(private readonly shiftPlanService: ShiftPlanService) {}

    @Post('adjustments/search')
    async searchAdjustments(
        @Body() body: SearchShiftPlanBodyDto,
        @Query() query: SearchShiftPlanQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.searchAdjustments(
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

    @Delete('adjustments/:id')
    async deleteAdjustment(
        @Param('id') id: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.deleteAdjustment(id, req.user);
    }

    @Post('adjustments/create')
    async createShiftAdjustment(
        @Body() body: CreateShiftAdjustmentBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.createShiftAdjustment(
            body,
            req.user,
        );
    }

    @Post('bulk-deactivate')
    async bulkDeactivateShiftPlans(
        @Body() body: BulkDeactivateShiftPlansBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.bulkDeactivate(body, req.user);
    }

    @Post('create-bulk')
    async createBulkShiftPlans(
        @Body() body: CreateBulkShiftPlanBodyDto,
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
        @Body() body: UpdateShiftPlanBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.shiftPlanService.updateShiftPlan(id, body, req.user);
    }

    @Post('search')
    async searchShiftPlans(
        @Body() body: SearchShiftPlanBodyDto,
        @Query() query: SearchShiftPlanQueryDto,
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
