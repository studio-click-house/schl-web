import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from '@repo/common/models/role.schema';
import { User } from '@repo/common/models/user.schema';
import type { Permissions } from '@repo/common/types/permission.type';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    hasPerm,
    sanitizePermissions,
} from '@repo/common/utils/permission-check';
import { FilterQuery, Model } from 'mongoose';
import { CreateRoleBodyDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Role.name) private roleModel: Model<Role>,
        private readonly config: ConfigService,
    ) {}

    async searchRoles(
        filters: { name?: string },
        pagination: {
            page: number;
            itemsPerPage: number;
            // filtered: boolean;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        const viewerIsSuper = hasPerm(
            'settings:the_super_admin',
            userSession.permissions,
        );

        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;
        const { name } = filters;

        type SearchQuery = FilterQuery<Role>;
        const searchQuery: SearchQuery = {};
        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        // if (filtered && !name) {
        //     throw new BadRequestException('No filter applied');
        // }

        if (name) {
            searchQuery.name = { $regex: name, $options: 'i' };
        }

        const skip = (page - 1) * itemsPerPage;

        // Build count respecting super-admin visibility (non-super viewers should not see super-admin role)
        let count: number;
        try {
            if (paginated) {
                const countFilter: FilterQuery<Role> = { ...searchQuery };
                if (!viewerIsSuper) {
                    countFilter.permissions = {
                        $not: { $in: ['settings:the_super_admin'] },
                    };
                }
                count = await this.roleModel.countDocuments(countFilter).exec();
            } else {
                const baseFilter: FilterQuery<Role> = { ...searchQuery };
                if (!viewerIsSuper) {
                    baseFilter.permissions = {
                        $not: { $in: ['settings:the_super_admin'] },
                    };
                }
                count = await this.roleModel.countDocuments(baseFilter).exec();
            }
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve roles at this time',
            );
        }

        let roles: Role[];
        try {
            if (paginated) {
                const findFilter: FilterQuery<Role> = { ...searchQuery };
                if (!viewerIsSuper) {
                    findFilter.permissions = {
                        $not: { $in: ['settings:the_super_admin'] },
                    };
                }
                roles = await this.roleModel
                    .find(findFilter)
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(itemsPerPage)
                    .lean()
                    .exec();
            } else {
                const baseFilter: FilterQuery<Role> = { ...searchQuery };
                if (!viewerIsSuper) {
                    baseFilter.permissions = {
                        $not: { $in: ['settings:the_super_admin'] },
                    };
                }
                roles = await this.roleModel.find(baseFilter).lean().exec();
            }
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve roles at this time',
            );
        }

        const pageCount: number = Math.ceil(count / itemsPerPage);

        if (!roles) {
            throw new BadRequestException('Unable to retrieve roles');
        }

        // Sanitize permissions output (ensure canonical typing)
        const safeItems = roles.map(r => ({
            ...r,
            permissions: sanitizePermissions(r.permissions),
        }));

        if (!paginated) {
            return safeItems;
        }

        return {
            pagination: {
                count,
                pageCount,
            },
            items: safeItems,
        };
    }

    async createRole(roleData: CreateRoleBodyDto, userSession: UserSession) {
        // Permission to create roles required
        if (!hasPerm('admin:create_role', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to create roles",
            );
        }

        const requestedPermissions = sanitizePermissions(roleData.permissions);

        // Guard super admin assignment unless caller is super admin
        if (
            requestedPermissions.includes('settings:the_super_admin') &&
            !hasPerm('settings:the_super_admin', userSession.permissions)
        ) {
            throw new ForbiddenException(
                "You can't assign the super admin permission",
            );
        }

        try {
            const created = await this.roleModel.create({
                name: roleData.name,
                description: roleData.description || '',
                permissions: requestedPermissions,
            });
            return {
                ...created.toObject(),
                permissions: requestedPermissions,
            };
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Role with this name already exists',
                );
            }
            throw new InternalServerErrorException(
                'Unable to create role at this time',
            );
        }
    }

    async updateRole(
        roleId: string,
        roleData: Partial<CreateRoleBodyDto>,
        userSession: UserSession,
    ) {
        const userPerms = userSession.permissions;
        const canManageAny = hasPerm('admin:create_role', userPerms);

        const existing = await this.roleModel.findById(roleId).exec();
        if (!existing) {
            throw new BadRequestException('Role not found');
        }

        const existingIsSuper = (existing.permissions || []).includes(
            'settings:the_super_admin',
        );
        if (
            existingIsSuper &&
            !hasPerm('settings:the_super_admin', userPerms)
        ) {
            throw new ForbiddenException("You can't edit this role");
        }

        const requestedPermissions = sanitizePermissions(roleData.permissions);

        if (!canManageAny) {
            if (requestedPermissions.length > 0) {
                const invalid = requestedPermissions.filter(
                    p => !hasPerm(p, userPerms),
                );
                if (invalid.length > 0) {
                    throw new ForbiddenException(
                        `You tried to assign permissions you don't have: ${invalid.join(', ')}`,
                    );
                }
            }
            if (
                requestedPermissions.includes('settings:the_super_admin') &&
                !hasPerm('settings:the_super_admin', userPerms)
            ) {
                throw new ForbiddenException(
                    "You can't assign the super admin permission",
                );
            }
        }
        // Even if manager, still cannot assign super admin permission without possessing it
        if (
            canManageAny &&
            requestedPermissions.includes('settings:the_super_admin') &&
            !hasPerm('settings:the_super_admin', userPerms)
        ) {
            throw new ForbiddenException(
                "You can't assign the super admin permission",
            );
        }

        if (roleData.name) {
            existing.name = roleData.name;
        }
        if (typeof roleData.description === 'string') {
            existing.description = roleData.description;
        }
        if (requestedPermissions.length > 0) {
            existing.permissions = requestedPermissions;
        }

        try {
            await existing.save();
            return existing;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Role with this name already exists',
                );
            }
            throw new InternalServerErrorException(
                'Unable to update role at this time',
            );
        }
    }

    async getRoleById(roleId: string, userSession: UserSession) {
        const role = await this.roleModel.findById(roleId).lean().exec();

        if (!role) {
            throw new NotFoundException('Role not found');
        }
        const viewerIsSuper = hasPerm(
            'settings:the_super_admin',
            userSession.permissions,
        );
        const roleIsSuper = (role.permissions || []).includes(
            'settings:the_super_admin',
        );
        if (roleIsSuper && !viewerIsSuper) {
            throw new ForbiddenException("You can't view this role");
        }
        const sanitized = sanitizePermissions(role.permissions);
        const { _id, name, description, ...rest } = role;
        const extra = rest as Record<string, unknown>;
        return {
            _id,
            name,
            description,
            permissions: sanitized,
            ...extra,
        };
    }

    async deleteRole(roleId: string, userSession: UserSession) {
        if (!hasPerm('admin:delete_role', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to delete roles",
            );
        }

        const existing = await this.roleModel.findById(roleId).exec();
        if (!existing) {
            throw new BadRequestException('Role not found');
        }

        // Prevent deleting super admin role without super admin permission
        if (
            (existing.permissions || []).includes('settings:the_super_admin') &&
            !hasPerm('settings:the_super_admin', userSession.permissions)
        ) {
            throw new ForbiddenException("You can't delete this role");
        }

        // Ensure no users are assigned to this role
        const assignedUsers = await this.userModel
            .countDocuments({ role: roleId })
            .exec();
        if (assignedUsers > 0) {
            throw new ConflictException(
                'Role is assigned to at least one user',
            );
        }

        try {
            await existing.deleteOne();
            return 'Role deleted successfully';
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to delete role at this time',
            );
        }
    }
}
