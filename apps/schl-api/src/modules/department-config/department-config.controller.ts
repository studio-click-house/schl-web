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
import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import { UserSession } from '@repo/common/types/user-session.type';
import { DepartmentConfigService } from './department-config.service';
import {
    CreateDepartmentConfigDto,
    GetDepartmentConfigQueryDto,
    UpdateDepartmentConfigDto,
} from './dto/department-config.dto';

@Controller('department-config')
export class DepartmentConfigController {
    constructor(
        private readonly departmentConfigService: DepartmentConfigService,
    ) {}

    @Post('create')
    async createDepartmentConfig(
        @Body() body: CreateDepartmentConfigDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.departmentConfigService.createDepartmentConfig(
            body,
            req.user,
        );
    }

    @Put('update/:department')
    async updateDepartmentConfig(
        @Param('department') department: string,
        @Body() body: UpdateDepartmentConfigDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return await this.departmentConfigService.updateDepartmentConfig(
            department as EmployeeDepartment,
            body,
            req.user,
        );
    }

    @Get('list')
    async getDepartmentConfigs(@Query() query: GetDepartmentConfigQueryDto) {
        return await this.departmentConfigService.getDepartmentConfigs(query);
    }

    @Get('detail/:department')
    async getDepartmentConfig(@Param('department') department: string) {
        return await this.departmentConfigService.getDepartmentConfig(
            department as EmployeeDepartment,
        );
    }

    @Delete('reset/:department')
    async deleteDepartmentConfig(@Param('department') department: string) {
        return await this.departmentConfigService.deleteDepartmentConfig(
            department as EmployeeDepartment,
        );
    }
}
