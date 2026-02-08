import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DepartmentService } from './department.service';
import {
    CreateDepartmentDto,
    UpdateDepartmentDto,
} from './dto/create-department.dto';

// Assuming basic auth guard is enough. Add permission checks if needed.
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Post()
    create(@Body() dto: CreateDepartmentDto) {
        return this.departmentService.create(dto);
    }

    @Get()
    findAll() {
        return this.departmentService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.departmentService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
        return this.departmentService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.departmentService.remove(id);
    }
}
