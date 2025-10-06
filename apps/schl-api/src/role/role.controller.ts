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
    Request,
} from '@nestjs/common';
import { UserSession } from 'src/common/types/user-session.type';
import { CreateRoleBodyDto } from './dto/create-role.dto';
import {
    SearchRolesBodyDto,
    SearchRolesQueryDto,
} from './dto/search-roles.dto';
import { RoleService } from './role.service';

@Controller('role')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post('search-roles')
    searchRoles(
        @Query() query: SearchRolesQueryDto,
        @Body() body: SearchRolesBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.roleService.searchRoles(body, pagination, req.user);
    }

    @Post('create-role')
    createRole(
        @Body() body: CreateRoleBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.createRole(body, req.user);
    }

    @Delete('delete-role/:id')
    deleteRole(
        @Param('id') roleId: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.deleteRole(roleId, req.user);
    }

    @Put('update-role/:id')
    updateRole(
        @Param('id') roleId: string,
        @Body() body: Partial<CreateRoleBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.updateRole(roleId, body, req.user);
    }

    @Get('get-role/:id')
    getRole(
        @Param('id') roleId: string,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.getRoleById(roleId, req.user);
    }
}
