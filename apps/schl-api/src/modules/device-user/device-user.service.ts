import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeviceUser } from '@repo/common/models/device-user.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Model } from 'mongoose';
import { CreateDeviceUserBodyDto } from './dto/create-device-user.dto';
import { SearchDeviceUsersBodyDto } from './dto/search-device-users.dto';
import { DeviceUserFactory } from './factories/device-user.factory';

@Injectable()
export class DeviceUserService {
    private readonly logger = new Logger(DeviceUserService.name);

    constructor(
        @InjectModel(DeviceUser.name)
        private readonly deviceUserModel: Model<DeviceUser>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,
    ) {}

    async getAllDeviceUsers(userSession: UserSession) {
        const canView = hasPerm(
            'admin:view_device_user',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view device users",
            );
        }

        try {
            return await this.deviceUserModel
                .find()
                .populate('employee')
                .sort({ createdAt: -1 })
                .exec();
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to get device users', err);
            throw new InternalServerErrorException(
                'Unable to retrieve device users',
            );
        }
    }

    async createDeviceUser(
        deviceUserData: CreateDeviceUserBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_device_user',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create device users",
            );
        }

        const userId = deviceUserData.userId.trim();

        // Check if user_id already exists
        const existingByUserId = await this.deviceUserModel
            .countDocuments({ user_id: userId })
            .exec();
        if (existingByUserId > 0) {
            throw new ConflictException(
                'Device user with the provided ID already exists',
            );
        }

        // Check if card_number already exists (if provided)
        if (
            deviceUserData.cardNumber &&
            deviceUserData.cardNumber.trim().length > 0
        ) {
            const cardNumber = deviceUserData.cardNumber.trim();
            const existingByCard = await this.deviceUserModel
                .countDocuments({ card_number: cardNumber })
                .exec();
            if (existingByCard > 0) {
                throw new ConflictException(
                    'Device user with the provided card number already exists',
                );
            }
        }

        const payload = DeviceUserFactory.fromCreateDto(deviceUserData);

        try {
            const created = await this.deviceUserModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create device user',
                );
            }
            return created;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Device user with the provided ID already exists',
                );
            }
            this.logger.error('Failed to create device user', err);
            throw new InternalServerErrorException(
                'Unable to create device user at this time',
            );
        }
    }

    async updateDeviceUser(
        deviceUserId: string,
        deviceUserData: Partial<CreateDeviceUserBodyDto>,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'admin:edit_device_user',
            userSession.permissions,
        );
        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to update device users",
            );
        }

        const existing = await this.deviceUserModel
            .findById(deviceUserId)
            .exec();
        if (!existing) {
            throw new NotFoundException('Device user not found');
        }

        // If updating user_id, check uniqueness
        if (
            deviceUserData.userId !== undefined &&
            deviceUserData.userId.trim() !== existing.user_id
        ) {
            const duplicateCount = await this.deviceUserModel
                .countDocuments({ user_id: deviceUserData.userId.trim() })
                .exec();
            if (duplicateCount > 0) {
                throw new ConflictException(
                    'Device user with the provided ID already exists',
                );
            }
        }

        // If updating card_number, check uniqueness
        if (deviceUserData.cardNumber !== undefined) {
            const newCard = deviceUserData.cardNumber?.trim() || null;
            const oldCard = existing.card_number || null;
            if (newCard !== oldCard && newCard) {
                const duplicateCount = await this.deviceUserModel
                    .countDocuments({ card_number: newCard })
                    .exec();
                if (duplicateCount > 0) {
                    throw new ConflictException(
                        'Device user with the provided card number already exists',
                    );
                }
            }
        }

        const patch = DeviceUserFactory.fromUpdateDto(deviceUserData);
        if (Object.keys(patch as Record<string, unknown>).length === 0) {
            throw new BadRequestException('No update fields provided');
        }

        Object.assign(existing, patch);

        try {
            const saved = await existing.save();
            return saved;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Device user with the provided ID already exists',
                );
            }
            this.logger.error('Failed to update device user', err);
            throw new InternalServerErrorException(
                'Unable to update device user at this time',
            );
        }
    }

    async getDeviceUser(deviceUserId: string, userSession: UserSession) {
        const canView = hasPerm(
            'admin:view_device_user',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view device users",
            );
        }

        try {
            const found = await this.deviceUserModel
                .findById(deviceUserId)
                .populate('employee')
                .exec();
            if (!found) {
                throw new NotFoundException('Device user not found');
            }
            return found;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to get device user', err);
            throw new InternalServerErrorException(
                'Unable to retrieve device user',
            );
        }
    }

    async getDeviceUserByUserId(userId: string, userSession: UserSession) {
        const canView = hasPerm(
            'admin:view_device_user',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view device users",
            );
        }

        try {
            const found = await this.deviceUserModel
                .findOne({ user_id: userId })
                .populate('employee')
                .exec();
            if (!found) {
                throw new NotFoundException('Device user not found');
            }
            return found;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to get device user by user_id', err);
            throw new InternalServerErrorException(
                'Unable to retrieve device user',
            );
        }
    }

    async searchDeviceUsers(
        filters: SearchDeviceUsersBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        const canView = hasPerm(
            'admin:view_device_user',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view device users",
            );
        }

        const { page, itemsPerPage, paginated } = pagination;
        const { searchString } = filters;

        const query: Record<string, unknown> = {};

        if (searchString) {
            const orClauses: Record<string, unknown>[] = buildOrRegex(
                searchString,
                ['user_id', 'card_number', 'comment'],
            );

            const employeeRegex = createRegexQuery(searchString);
            if (employeeRegex) {
                const matchingEmployees = await this.employeeModel
                    .find({
                        $or: [
                            { e_id: employeeRegex },
                            { real_name: employeeRegex },
                            { company_provided_name: employeeRegex },
                        ],
                    })
                    .select('_id')
                    .lean()
                    .exec();

                if (matchingEmployees.length > 0) {
                    orClauses.push({
                        employee: {
                            $in: matchingEmployees.map(e => e._id),
                        },
                    });
                }
            }

            if (orClauses.length > 0) {
                query.$or = orClauses;
            }
        }

        const sortQuery: Record<string, 1 | -1> = { createdAt: -1 };

        try {
            if (!paginated) {
                return await this.deviceUserModel
                    .find(query)
                    .populate('employee')
                    .sort(sortQuery)
                    .exec();
            }

            const skip = (page - 1) * itemsPerPage;
            const [count, items] = await Promise.all([
                this.deviceUserModel.countDocuments(query).exec(),
                this.deviceUserModel
                    .find(query)
                    .populate('employee')
                    .sort(sortQuery)
                    .skip(skip)
                    .limit(itemsPerPage)
                    .exec(),
            ]);

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                    page,
                    itemsPerPage,
                },
                items,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to search device users', err);
            throw new InternalServerErrorException(
                'Unable to retrieve device users',
            );
        }
    }

    async deleteDeviceUser(deviceUserId: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:delete_device_user',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete device users",
            );
        }

        const existing = await this.deviceUserModel
            .findById(deviceUserId)
            .exec();
        if (!existing) {
            throw new NotFoundException('Device user not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Device user deleted successfully' };
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete device user', err);
            throw new InternalServerErrorException(
                'Unable to delete device user',
            );
        }
    }
}
