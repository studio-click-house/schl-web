import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from '@repo/common/models/role.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { UserController } from './user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],
    controllers: [UserController],
    providers: [AuthService, UserService],
})
export class UserModule {}
