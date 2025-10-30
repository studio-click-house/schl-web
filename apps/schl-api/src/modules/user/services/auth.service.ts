import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@repo/common/models/user.schema';
import { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm, toPermissions } from '@repo/common/utils/permission-check';
import jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { LoginQueryDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly config: ConfigService,
    ) {}

    async login(
        username: string,
        password: string,
        clientType: LoginQueryDto['clientType'],
    ) {
        try {
            console.log(
                `Attempting login for user: ${username} on client: ${clientType}`,
            );

            const userData = await this.userModel
                .findOne({
                    username: username,
                    password: password,
                })
                .populate([
                    { path: 'role', select: '_id name permissions' },
                    {
                        path: 'employee',
                        select: '_id e_id real_name company_provided_name',
                    },
                ])
                .lean<FullyPopulatedUser>()
                .exec();

            if (userData) {
                const userPermissions = toPermissions(
                    userData.role.permissions,
                );

                if (!hasPerm(`login:${clientType}`, userPermissions)) {
                    throw new ForbiddenException(
                        `You do not have permission to login to ${clientType}`,
                    );
                }

                return userData;
            }
            throw new BadRequestException('Invalid username or password');
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to login');
        }
    }

    async verifyUser(
        username: string,
        password: string,
        userSession: UserSession,
        redirectPath: string = '/',
    ) {
        try {
            const userData = await this.userModel
                .findOne({
                    username: username,
                    password: password,
                })
                .exec();

            if (!userData) {
                throw new BadRequestException('Invalid username or password');
            }

            if (userData._id.toString() === userSession.db_id) {
                const token = jwt.sign(
                    {
                        userId: userData._id,
                        exp: Math.floor(Date.now() / 1000) + 10,
                    },
                    this.config.get<string>('AUTH_SECRET')!,
                );

                return { token, redirect_path: redirectPath };
            } else {
                throw new ForbiddenException(
                    'You are not authorized to verify this user',
                );
            }
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to verify user');
        }
    }
}
