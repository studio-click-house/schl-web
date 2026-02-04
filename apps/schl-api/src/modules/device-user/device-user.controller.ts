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
import { UserSession } from '@repo/common/types/user-session.type';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { DeviceUserService } from './device-user.service';
import { CreateDeviceUserBodyDto } from './dto/create-device-user.dto';
import {
    SearchDeviceUsersBodyDto,
    SearchDeviceUsersQueryDto,
} from './dto/search-device-users.dto';

@Controller('device-user')
export class DeviceUserController {
    constructor(private readonly deviceUserService: DeviceUserService) {}

    @Post('create-user')
    createDeviceUser(
        @Body() body: CreateDeviceUserBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.deviceUserService.createDeviceUser(body, req.user);
    }

    @Get('get-all')
    getAllDeviceUsers(@Req() req: Request & { user: UserSession }) {
        return this.deviceUserService.getAllDeviceUsers(req.user);
    }

    @Put('update-user/:id')
    updateDeviceUser(
        @Param() { id }: IdParamDto,
        @Body() body: Partial<CreateDeviceUserBodyDto>,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.deviceUserService.updateDeviceUser(id, body, req.user);
    }

    @Get('get-user/:param')
    getDeviceUser(
        @Param('param') param: string,
        @Req() req: Request & { user: UserSession },
    ) {
        const value = param.trim();
        const isPotentialObjectId =
            value.length === 24 && /^[0-9a-fA-F]{24}$/.test(value);
        if (isPotentialObjectId) {
            return this.deviceUserService.getDeviceUser(value, req.user);
        }
        return this.deviceUserService.getDeviceUserByUserId(value, req.user);
    }

    @Post('search')
    searchDeviceUsers(
        @Query() query: SearchDeviceUsersQueryDto,
        @Body() body: SearchDeviceUsersBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        const pagination = {
            page: query.page,
            itemsPerPage: query.itemsPerPage,
            paginated: query.paginated,
        };

        return this.deviceUserService.searchDeviceUsers(
            body,
            pagination,
            req.user,
        );
    }

    @Delete('delete-user/:id')
    deleteDeviceUser(
        @Param() { id }: IdParamDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.deviceUserService.deleteDeviceUser(id, req.user);
    }
}
