import { Body, Controller, Param, Post, Put, Query, Req } from '@nestjs/common';
import { IdParamDto } from 'src/common/dto/id-param.dto';
import { UserSession } from 'src/common/types/user-session.type';
import { CreateEmployeeBodyDto } from './dto/create-employee.dto';
import {
    SearchEmployeesBodyDto,
    SearchEmployeesQueryDto,
} from './dto/search-employees.dto';
import { EmployeeService } from './employee.service';

@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) {}

    @Post('create-employee')
    createEmployee(
        @Body() body: CreateEmployeeBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.employeeService.createEmployee(body, req.user);
    }

    @Put('update-employee/:id')
    updateEmployee(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateEmployeeBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.employeeService.updateEmployee(id, body, req.user);
    }

    @Post('search-employees')
    searchEmployees(
        @Query() query: SearchEmployeesQueryDto,
        @Body() body: SearchEmployeesBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };
        return this.employeeService.searchEmployees(body, pagination, req.user);
    }
}
