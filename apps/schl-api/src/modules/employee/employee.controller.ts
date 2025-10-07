import { Body, Controller, Post, Req } from '@nestjs/common';
import { UserSession } from 'src/common/types/user-session.type';
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
}
