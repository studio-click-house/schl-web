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
import { ShiftSchedule } from '@repo/common/models/shift-schedule.schema';
import { Shift } from '@repo/common/models/shift.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import mongoose, { Model } from 'mongoose';
import {
    AssignEmployeeShiftDto,
    BulkAssignShiftDto,
    GetShiftScheduleDto,
} from './dto/shift-schedule.dto';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { ShiftScheduleFactory } from './factories/shift-schedule.factory';
import { ShiftFactory } from './factories/shift.factory';

@Injectable()
export class ShiftService {
    private readonly logger = new Logger(ShiftService.name);

    constructor(
        @InjectModel(Shift.name)
        private shiftModel: Model<Shift>,
        @InjectModel(ShiftSchedule.name)
        private scheduleModel: Model<ShiftSchedule>,
    ) {}

    // ==================== SHIFT CRUD ====================

    async createShift(dto: CreateShiftDto, userSession: UserSession) {
        const canCreate = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create shifts",
            );
        }

        // Check if shift type already exists
        const existing = await this.shiftModel
            .findOne({ type: dto.type })
            .exec();
        if (existing) {
            throw new ConflictException(
                `A shift of type "${dto.type}" already exists`,
            );
        }

        const payload = ShiftFactory.fromCreateDto(dto);

        try {
            const created = await this.shiftModel.create(payload);
            return created;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create shift', err);
            throw new InternalServerErrorException(
                'Unable to create shift at this time',
            );
        }
    }

    async updateShift(
        shiftId: string,
        dto: UpdateShiftDto,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to update shifts",
            );
        }

        const existing = await this.shiftModel.findById(shiftId).exec();
        if (!existing) {
            throw new NotFoundException('Shift not found');
        }

        const patch = ShiftFactory.fromUpdateDto(dto);

        try {
            const updated = await this.shiftModel.findByIdAndUpdate(
                shiftId,
                { $set: patch },
                { new: true },
            );
            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to update shift', err);
            throw new InternalServerErrorException(
                'Unable to update shift at this time',
            );
        }
    }

    async getAllShifts() {
        return await this.shiftModel.find({ is_active: true }).exec();
    }

    async getShiftById(shiftId: string) {
        const shift = await this.shiftModel.findById(shiftId).exec();
        if (!shift) {
            throw new NotFoundException('Shift not found');
        }
        return shift;
    }

    async deleteShift(shiftId: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete shifts",
            );
        }

        const existing = await this.shiftModel.findById(shiftId).exec();
        if (!existing) {
            throw new NotFoundException('Shift not found');
        }

        // Check if shift is in use
        const inUse = await this.scheduleModel
            .findOne({ shift: new mongoose.Types.ObjectId(shiftId) })
            .exec();
        if (inUse) {
            throw new BadRequestException(
                'Cannot delete shift that is assigned to employees. Deactivate it instead.',
            );
        }

        try {
            await existing.deleteOne();
            return { message: 'Shift deleted successfully' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete shift', err);
            throw new InternalServerErrorException(
                'Unable to delete shift at this time',
            );
        }
    }

    // ==================== EMPLOYEE SHIFT SCHEDULE ====================

    async assignEmployeeShift(
        dto: AssignEmployeeShiftDto,
        userSession: UserSession,
    ) {
        const canAssign = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canAssign) {
            throw new ForbiddenException(
                "You don't have permission to assign shifts",
            );
        }

        // Verify shift exists
        const shift = await this.shiftModel.findById(dto.shiftId).exec();
        if (!shift) {
            throw new NotFoundException('Shift not found');
        }

        const payload = ShiftScheduleFactory.fromAssignDto(
            dto,
            new mongoose.Types.ObjectId(userSession.db_id),
        );

        try {
            // Upsert: update if exists for the same employee + date range, else create
            const result = await this.scheduleModel.findOneAndUpdate(
                {
                    employee: payload.employee,
                    start_date: payload.start_date,
                },
                { $set: payload },
                { upsert: true, new: true },
            );
            return result;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to assign employee shift', err);
            throw new InternalServerErrorException(
                'Unable to assign shift at this time',
            );
        }
    }

    async bulkAssignShift(dto: BulkAssignShiftDto, userSession: UserSession) {
        const canAssign = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canAssign) {
            throw new ForbiddenException(
                "You don't have permission to assign shifts",
            );
        }

        // Verify shift exists
        const shift = await this.shiftModel.findById(dto.shiftId).exec();
        if (!shift) {
            throw new NotFoundException('Shift not found');
        }

        const startDate = ShiftScheduleFactory.normalizeToStartOfDay(
            dto.startDate,
        );
        const endDate = ShiftScheduleFactory.normalizeToEndOfDay(dto.endDate);
        const assignedBy = new mongoose.Types.ObjectId(userSession.db_id);

        const operations = dto.employeeIds.map(employeeId => ({
            updateOne: {
                filter: {
                    employee: new mongoose.Types.ObjectId(employeeId),
                    start_date: startDate,
                },
                update: {
                    $set: {
                        employee: new mongoose.Types.ObjectId(employeeId),
                        shift: new mongoose.Types.ObjectId(dto.shiftId),
                        shift_type: dto.shiftType,
                        start_date: startDate,
                        end_date: endDate,
                        notes: dto.notes?.trim() || '',
                        assigned_by: assignedBy,
                    },
                },
                upsert: true,
            },
        }));

        try {
            const result = await this.scheduleModel.bulkWrite(operations);
            return {
                message: `Successfully assigned shift to ${result.upsertedCount + result.modifiedCount} employees`,
                upserted: result.upsertedCount,
                modified: result.modifiedCount,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to bulk assign shifts', err);
            throw new InternalServerErrorException(
                'Unable to bulk assign shifts at this time',
            );
        }
    }

    async getShiftSchedules(query: GetShiftScheduleDto) {
        const filter: any = {};

        if (query.employeeId) {
            filter.employee = new mongoose.Types.ObjectId(query.employeeId);
        }

        if (query.shiftType) {
            filter.shift_type = query.shiftType;
        }

        // Date range filtering
        if (query.fromDate && query.toDate) {
            filter.start_date = {
                $gte: ShiftScheduleFactory.normalizeToStartOfDay(
                    query.fromDate,
                ),
                $lte: ShiftScheduleFactory.normalizeToEndOfDay(query.toDate),
            };
        } else if (query.fromDate) {
            filter.start_date = {
                $gte: ShiftScheduleFactory.normalizeToStartOfDay(
                    query.fromDate,
                ),
            };
        } else if (query.toDate) {
            filter.start_date = {
                $lte: ShiftScheduleFactory.normalizeToEndOfDay(query.toDate),
            };
        }

        const { page, itemsPerPage, paginated } = query;

        if (!paginated) {
            return await this.scheduleModel
                .find(filter)
                .populate('employee', 'e_id real_name designation department')
                .populate('shift', 'type name start_time end_time')
                .sort({ start_date: -1 })
                .exec();
        }

        const skip = (page - 1) * itemsPerPage;
        const count = await this.scheduleModel.countDocuments(filter).exec();

        const items = await this.scheduleModel
            .find(filter)
            .populate('employee', 'e_id real_name designation department')
            .populate('shift', 'type name start_time end_time')
            .sort({ start_date: -1 })
            .skip(skip)
            .limit(itemsPerPage)
            .exec();

        const pageCount = Math.ceil(count / itemsPerPage);

        return {
            pagination: {
                count,
                pageCount,
            },
            items,
        };
    }

    async getEmployeeCurrentShift(employeeId: string, date?: Date) {
        const targetDate = date || new Date();
        const startOfDay =
            ShiftScheduleFactory.normalizeToStartOfDay(targetDate);
        const endOfDay = ShiftScheduleFactory.normalizeToEndOfDay(targetDate);

        // Find schedule where target date falls within the date range
        const schedule = await this.scheduleModel
            .findOne({
                employee: new mongoose.Types.ObjectId(employeeId),
                start_date: { $lte: endOfDay },
                end_date: { $gte: startOfDay },
            })
            .populate('shift')
            .exec();

        return schedule;
    }

    async getEmployeesByShift(shiftType: string, startDate: Date) {
        const normalizedDate =
            ShiftScheduleFactory.normalizeToStartOfDay(startDate);

        return await this.scheduleModel
            .find({
                shift_type: shiftType,
                start_date: { $lte: normalizedDate },
                end_date: { $gte: normalizedDate },
            })
            .populate('employee', 'e_id real_name designation department')
            .exec();
    }

    async deleteShiftSchedule(scheduleId: string, userSession: UserSession) {
        const canManage = hasPerm(
            'admin:manage_shifts',
            userSession.permissions,
        );
        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to delete shift schedules",
            );
        }

        const existing = await this.scheduleModel.findById(scheduleId).exec();
        if (!existing) {
            throw new NotFoundException('Schedule not found');
        }

        try {
            await existing.deleteOne();
            return { message: 'Schedule deleted successfully' };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to delete schedule', err);
            throw new InternalServerErrorException(
                'Unable to delete schedule at this time',
            );
        }
    }
}
