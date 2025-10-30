import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from '@repo/common/models/role.schema';
import { User, UserSchema } from '@repo/common/models/user.schema';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
        ]),
    ],
    controllers: [RoleController],
    providers: [RoleService],
})
export class RoleModule {}
