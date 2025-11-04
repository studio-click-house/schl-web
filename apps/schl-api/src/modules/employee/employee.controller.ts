import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
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
            // filtered: query.filtered,
            paginated: query.paginated,
        };
        return this.employeeService.searchEmployees(body, pagination, req.user);
    }

    @Get('get-employee/:param')
    getEmployee(
        @Param('param') param: string, // either e_id or _id of the employee
        @Req() req: Request & { user: UserSession },
    ) {
        const value = param.trim();
        const isPotentialObjectId =
            value.length === 24 && /^[0-9a-fA-F]{24}$/.test(value);
        if (isPotentialObjectId) {
            return this.employeeService.getEmployeeByDbId(value, req.user);
        }
        return this.employeeService.getEmployeeById(value, req.user);
    }
}
