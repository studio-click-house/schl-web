import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from 'src/models/role.schema';
import { User, UserSchema } from 'src/models/user.schema';
import { AuthService } from './services/auth.service';
import { ManagementService } from './services/management.service';
import { UserController } from './user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],
    controllers: [UserController],
    providers: [AuthService, ManagementService],
})
export class UserModule {}
