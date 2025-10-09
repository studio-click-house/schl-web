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
import { Public } from 'src/common/auth/public.decorator';
import { IdParamDto } from 'src/common/dto/id-param.dto';
import { UserSession } from 'src/common/types/user-session.type';
import { RequestHeader } from 'src/pipes/request-header.pipe';
import { ChangePasswordBodyDto } from './dto/change-password.dto';
import { CreateUserBodyDto } from './dto/create-user.dto';
import { GetUserQueryDto } from './dto/get-user.dto';
import { LoginBodyDto, LoginHeaderDto } from './dto/login.dto';
import {
    SearchUsersBodyDto,
    SearchUsersQueryDto,
} from './dto/search-users.dto';
import { VerifyUserBodyDto } from './dto/verify-user.dto';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';

@Controller('user')
export class UserController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

    @Public()
    @Post('login')
    login(
        @Body() body: LoginBodyDto,
        @RequestHeader(LoginHeaderDto) header: LoginHeaderDto,
    ) {
        return this.authService.login(
            body.username,
            body.password,
            header.clientType,
        );
    }

    @Post('change-password/:id')
    changePassword(
        @Param() { id }: IdParamDto,
        @Body() body: ChangePasswordBodyDto,
    ) {
        return this.userService.changePassword(
            id,
            body.old_password,
            body.new_password,
        );
    }

    @Post('verify-user')
    verifyUser(
        @Body() body: VerifyUserBodyDto,
        @Req() req: Request & { user: UserSession },
        @Param('redirect') redirectPath: string,
    ) {
        return this.authService.verifyUser(
            body.username,
            body.password,
            req.user,
            redirectPath,
        );
    }

    @Post('create-user')
    createUser(
        @Body() body: CreateUserBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.userService.createUser(body, req.user);
    }

    @Put('update-user/:id')
    updateUser(
        @Param() { id }: IdParamDto,
        @Body() userData: Partial<CreateUserBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.userService.updateUser(id, userData, req.user);
    }

    @Delete('delete-user/:id')
    deleteUser(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.userService.deleteUser(id, req.user);
    }

    @Post('search-users')
    searchUsers(
        @Query() query: SearchUsersQueryDto,
        @Body() body: SearchUsersBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.userService.searchUsers(body, pagination, req.user);
    }

    @Get('get-user/:id')
    getUser(
        @Param() { id }: IdParamDto,
        @Query() query: GetUserQueryDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const wantsExpanded = query.expanded;
        return this.userService.getUserById(id, req.user, wantsExpanded);
    }
}
