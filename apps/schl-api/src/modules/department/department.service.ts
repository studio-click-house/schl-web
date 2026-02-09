import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    Department,
    DepartmentDocument,
} from '@repo/common/models/department.schema';
import { Model } from 'mongoose';
import {
    CreateDepartmentDto,
    UpdateDepartmentDto,
} from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectModel(Department.name)
        private departmentModel: Model<DepartmentDocument>,
    ) {}

    async create(dto: CreateDepartmentDto) {
        const existing = await this.departmentModel.findOne({ name: dto.name });
        if (existing) {
            throw new BadRequestException('Department already exists');
        }
        const { weekendDays, ...rest } = dto;
        return await this.departmentModel.create({
            ...rest,
            weekend_days: weekendDays,
        });
    }

    async findAll() {
        return await this.departmentModel.find().sort({ name: 1 }).lean();
    }

    async findOne(id: string) {
        const doc = await this.departmentModel.findById(id).lean();
        if (!doc) throw new NotFoundException('Department not found');
        return doc;
    }

    async update(id: string, dto: UpdateDepartmentDto) {
        if (dto.name) {
            const existing = await this.departmentModel.findOne({
                name: dto.name,
                _id: { $ne: id },
            });
            if (existing) {
                throw new BadRequestException('Department name already taken');
            }
        }

        const updatePayload: Partial<Department> = {
            ...dto,
        } as Partial<Department>;
        if (dto.weekendDays) {
            updatePayload.weekend_days = dto.weekendDays;
            delete (updatePayload as any).weekendDays;
        }

        const updated = await this.departmentModel
            .findByIdAndUpdate(id, updatePayload, { new: true })
            .lean();
        if (!updated) throw new NotFoundException('Department not found');
        return updated;
    }

    async remove(id: string) {
        // Ideally check if employees are assigned, but for now just delete config.
        const deleted = await this.departmentModel.findByIdAndDelete(id).lean();
        if (!deleted) throw new NotFoundException('Department not found');
        return deleted;
    }
}
