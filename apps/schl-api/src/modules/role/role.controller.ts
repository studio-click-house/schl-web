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
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
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
            // filtered: query.filtered,
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
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.deleteRole(id, req.user);
    }

    @Put('update-role/:id')
    updateRole(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateRoleBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.updateRole(id, body, req.user);
    }

    @Get('get-role/:id')
    getRole(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.roleService.getRoleById(id, req.user);
    }
}
