import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { PopulatedUser } from 'src/common/types/populated-user.type';
import { UserSession } from 'src/common/types/user-session.type';
import { hasPerm, toPermissions } from 'src/common/utils/permission-check';
import { User } from 'src/models/user.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly config: ConfigService,
    ) {}

    async login(
        username: string,
        password: string,
        clientType: 'portal' | 'crm',
    ) {
        const userData = await this.userModel
            .findOne({
                name: username,
                password: password,
            })
            .populate('role', 'name permissions')
            .lean<PopulatedUser>()
            .exec();

        if (userData) {
            const userPermissions = toPermissions(userData.role.permissions);

            if (!hasPerm(`login:${clientType}`, userPermissions)) {
                throw new UnauthorizedException(
                    `You do not have permission to login to ${clientType}`,
                );
            }
            return userData;
        }
        throw new UnauthorizedException('Invalid username or password');
    }

    async changePassword(
        username: string,
        old_password: string,
        new_password: string,
    ) {
        const userData = await this.userModel
            .findOne({
                name: username,
                password: old_password,
            })
            .exec();
        if (!userData) {
            throw new UnauthorizedException('Invalid username or password');
        }

        userData.password = new_password;
        await userData.save();

        return 'Password changed successfully';
    }

    async verifyUser(
        username: string,
        password: string,
        userSession: UserSession,
        redirectPath: string = '/',
    ) {
        const userData = await this.userModel
            .findOne({
                name: username,
                password: password,
            })
            .exec();

        if (!userData) {
            throw new UnauthorizedException('Invalid username or password');
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
    }
}
