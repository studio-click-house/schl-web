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
    Res,
} from '@nestjs/common';
import { UserSession } from '@repo/common/types/user-session.type';
import type {
    Request as ExpressRequest,
    Response as ExpressResponse,
} from 'express';
import { Public } from '../../common/auth/public.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { ChangePasswordBodyDto } from './dto/change-password.dto';
import { CreateUserBodyDto } from './dto/create-user.dto';
import { GetUserQueryDto } from './dto/get-user.dto';
import { LoginBodyDto, LoginQueryDto } from './dto/login.dto';
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

        @Query() { clientType }: LoginQueryDto,
    ) {
        return this.authService.login(body.username, body.password, clientType);
    }

    @Post('change-password/:id')
    changePassword(
        @Param() { id }: IdParamDto,
        @Body() body: ChangePasswordBodyDto,
    ) {
        return this.userService.changePassword(
            id,
            body.oldPassword,
            body.newPassword,
        );
    }

    @Post('verify-user')
    async verifyUser(
        @Body() body: VerifyUserBodyDto,
        @Req() req: ExpressRequest & { user: UserSession },
        @Query('redirect') redirectPath: string,
        @Res({ passthrough: true }) res: ExpressResponse,
    ) {
        const origin = req.get('origin') || req.get('host') || '';
        const result = await this.authService.verifyUser(
            body.username,
            body.password,
            req.user,
            redirectPath,
            origin,
        );
        if (
            typeof result === 'object' &&
            result !== null &&
            'token' in result &&
            typeof result.token === 'string'
        ) {
            const isLocalhost = origin?.includes('localhost');
            res.cookie('verify-token.tmp', result.token, {
                path: '/',
                httpOnly: true,
                maxAge: 10_000,
                sameSite: isLocalhost ? 'lax' : 'none',
                secure: !isLocalhost,
            });
        }
        return result;
    }

    @Post('create-user')
    createUser(
        @Body() userData: CreateUserBodyDto,
        @Req() req: ExpressRequest & { user: UserSession },
    ) {
        return this.userService.createUser(userData, req.user);
    }

    @Put('update-user/:id')
    updateUser(
        @Param() { id }: IdParamDto,
        @Body() userData: Partial<CreateUserBodyDto>,
        @Req() req: ExpressRequest & { user: UserSession },
    ) {
        return this.userService.updateUser(id, userData, req.user);
    }

    @Delete('delete-user/:id')
    deleteUser(
        @Param() { id }: IdParamDto,
        @Req() req: ExpressRequest & { user: UserSession },
    ) {
        return this.userService.deleteUser(id, req.user);
    }

    @Post('search-users')
    searchUsers(
        @Query() query: SearchUsersQueryDto,
        @Body() body: SearchUsersBodyDto,
        @Req() req: ExpressRequest & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            // filtered: query.filtered,
            paginated: query.paginated,
        };

        return this.userService.searchUsers(body, pagination, req.user);
    }

    @Get('get-user/:id')
    getUser(
        @Param() { id }: IdParamDto,
        @Query() query: GetUserQueryDto,
        @Req() req: ExpressRequest & { user: UserSession },
    ) {
        const wantsExpanded = query.expanded;
        return this.userService.getUserById(id, req.user, wantsExpanded);
    }
}
