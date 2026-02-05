import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    EMPLOYEE_DEPARTMENTS,
    EmployeeDepartment,
} from '@repo/common/constants/employee.constant';
import { WeekDay } from '@repo/common/constants/shift.constant';
import { DepartmentConfig } from '@repo/common/models/department-config.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { DEFAULT_WEEKEND_DAYS } from '@repo/common/utils/overtime.util';
import { Model, Types } from 'mongoose';
import {
    CreateDepartmentConfigDto,
    GetDepartmentConfigQueryDto,
    UpdateDepartmentConfigDto,
} from './dto/department-config.dto';

@Injectable()
export class DepartmentConfigService {
    constructor(
        @InjectModel(DepartmentConfig.name)
        private departmentConfigModel: Model<DepartmentConfig>,
    ) {}

    async createDepartmentConfig(
        dto: CreateDepartmentConfigDto,
        user: UserSession,
    ) {
        const weekendDays = dto.weekendDays ?? dto.weekendDays ?? [];

        // Check if config already exists for this department
        const existing = await this.departmentConfigModel.findOne({
            department: dto.department,
        });

        if (existing) {
            throw new BadRequestException(
                `Configuration already exists for department ${dto.department}. Use update instead.`,
            );
        }

        const config = new this.departmentConfigModel({
            department: dto.department,
            weekend_days: weekendDays,
            updated_by: new Types.ObjectId(user.db_id),
        });

        return await config.save();
    }

    async updateDepartmentConfig(
        department: EmployeeDepartment,
        dto: UpdateDepartmentConfigDto,
        user: UserSession,
    ) {
        const weekendDays = dto.weekendDays ?? dto.weekendDays ?? [];
        const config = await this.departmentConfigModel.findOneAndUpdate(
            { department },
            {
                weekend_days: weekendDays,
                updated_by: new Types.ObjectId(user.db_id),
            },
            { new: true },
        );

        if (!config) {
            // Create new config if it doesn't exist
            const newConfig = new this.departmentConfigModel({
                department,
                weekend_days: weekendDays,
                updated_by: new Types.ObjectId(user.db_id),
            });
            return await newConfig.save();
        }

        return config;
    }

    async getDepartmentConfigs(query: GetDepartmentConfigQueryDto) {
        const filter: Record<string, any> = {};

        if (query.department) {
            filter.department = query.department;
        }

        const configs = await this.departmentConfigModel.find(filter).exec();

        // Get all departments that have custom configurations
        const configuredDepartments = new Set(configs.map(c => c.department));

        // Add default configurations for departments without custom settings
        const allDepartments = EMPLOYEE_DEPARTMENTS;
        const results: Array<{
            department: EmployeeDepartment;
            weekend_days: WeekDay[];
            is_default: boolean;
            _id?: Types.ObjectId;
        }> = [];

        for (const dept of allDepartments) {
            if (query.department && dept !== query.department) continue;

            const existingConfig = configs.find(c => c.department === dept);
            if (existingConfig) {
                results.push({
                    _id: existingConfig._id,
                    department: existingConfig.department,
                    weekend_days: existingConfig.weekend_days,
                    is_default: false,
                });
            } else {
                results.push({
                    department: dept,
                    weekend_days: [...DEFAULT_WEEKEND_DAYS] as WeekDay[],
                    is_default: true,
                });
            }
        }

        return results;
    }

    async getDepartmentConfig(department: EmployeeDepartment) {
        const config = await this.departmentConfigModel.findOne({ department });

        if (!config) {
            return {
                department,
                weekend_days: DEFAULT_WEEKEND_DAYS,
                is_default: true,
            };
        }

        return {
            _id: config._id,
            department: config.department,
            weekend_days: config.weekend_days,
            is_default: false,
        };
    }

    async deleteDepartmentConfig(department: EmployeeDepartment) {
        const result = await this.departmentConfigModel.deleteOne({
            department,
        });

        if (result.deletedCount === 0) {
            throw new NotFoundException(
                `No custom configuration found for department ${department}`,
            );
        }

        return {
            success: true,
            message: `Configuration for ${department} reset to default`,
        };
    }
}
