import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AppUser } from '@repo/common/models/app-user.schema';
import { Model } from 'mongoose';
import { LoginTrackerDto } from './dto/auth.dto';

@Injectable()
export class TrackerAuthService {
    constructor(
        @InjectModel(AppUser.name)
        private readonly appUserModel: Model<AppUser>,
    ) {}

    async checkUser(username: string) {
        try {
            const user = await this.appUserModel
                .findOne({ username })
                .lean()
                .exec();

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return {
                exists: true,
                username: user.username,
                passwordRequired: user.is_password_set,
                role: (user.role ?? 'employee').toLowerCase(),
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to check user');
        }
    }

    async login(dto: LoginTrackerDto) {
        try {
            const user = await this.appUserModel
                .findOne({ username: dto.username })
                .lean()
                .exec();

            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }

            if (!user.is_password_set) {
                return {
                    valid: false,
                    passwordSetupRequired: true,
                    username: user.username,
                };
            }

            if (user.password !== dto.password) {
                throw new UnauthorizedException('Invalid credentials');
            }

            return {
                valid: true,
                role: (user.role ?? 'employee').toLowerCase(),
                username: user.username,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to login');
        }
    }

    async setPassword(username: string, password: string) {
        try {
            const user = await this.appUserModel.findOne({ username }).exec();

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (user.is_password_set) {
                throw new BadRequestException('Password already set');
            }

            user.password = password;
            user.is_password_set = true;
            await user.save();

            return {
                success: true,
                message: 'Password set successfully',
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to set password');
        }
    }
}
