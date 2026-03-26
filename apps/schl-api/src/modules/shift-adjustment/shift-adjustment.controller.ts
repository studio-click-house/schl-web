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
import { Request } from 'express';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { BulkDeactivateShiftAdjustmentsBodyDto } from './dto/bulk-deactivate-shift-adjustments.dto';
import { CreateShiftAdjustmentBodyDto } from './dto/create-shift-adjustment.dto';
import {
    SearchShiftAdjustmentBodyDto,
    SearchShiftAdjustmentQueryDto,
} from './dto/search-shift-adjustment.dto';
import { UpdateShiftAdjustmentBodyDto } from './dto/update-shift-adjustment.dto';
import { ShiftAdjustmentService } from './shift-adjustment.service';

@Controller('shift-adjustment')
export class ShiftAdjustmentController {
    constructor(
        private readonly shiftAdjustmentService: ShiftAdjustmentService,
    ) {}

    @Post('search')
    async searchAdjustments(
        @Body() body: SearchShiftAdjustmentBodyDto,
        @Query() query: SearchShiftAdjustmentQueryDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return await this.shiftAdjustmentService.searchAdjustments(
            body,
            {
                page: query.page ? Number(query.page) : 1,
                itemsPerPage: query.itemsPerPage
                    ? Number(query.itemsPerPage)
                    : 30,
                paginated:
                    query.paginated !== undefined
                        ? String(query.paginated) === 'true'
                        : true,
            },
            req.user,
        );
    }

    @Post('create')
    async createShiftAdjustment(
        @Body() body: CreateShiftAdjustmentBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return await this.shiftAdjustmentService.createShiftAdjustment(
            body,
            req.user,
        );
    }

    @Put(':id')
    async updateAdjustment(
        @Param() { id }: IdParamDto,
        @Body() body: UpdateShiftAdjustmentBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return await this.shiftAdjustmentService.updateAdjustment(
            id,
            body,
            req.user,
        );
    }

    @Post('bulk-deactivate')
    async bulkDeactivateAdjustments(
        @Body() body: BulkDeactivateShiftAdjustmentsBodyDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return await this.shiftAdjustmentService.bulkDeactivateAdjustments(
            body,
            req.user,
        );
    }

    @Delete(':id')
    async deleteAdjustment(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ): Promise<any> {
        return await this.shiftAdjustmentService.deleteAdjustment(id, req.user);
    }
}
