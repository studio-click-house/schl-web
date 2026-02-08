import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ShiftOverride } from '@repo/common/models/shift-override.schema';
import { ShiftResolved } from '@repo/common/models/shift-resolved.schema';
import { ShiftTemplate } from '@repo/common/models/shift-template.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { FilterQuery, Model } from 'mongoose';
import { CreateShiftOverrideBodyDto } from './dto/create-shift-override.dto';
import { CreateShiftTemplateBodyDto } from './dto/create-shift-template.dto';
import { SearchShiftPlansBodyDto } from './dto/search-shift-plan.dto';
import { UpdateShiftTemplateBodyDto } from './dto/update-shift-template.dto';

type QueryShape = FilterQuery<ShiftTemplate>;

@Injectable()
export class ShiftPlanService {
    private readonly logger = new Logger(ShiftPlanService.name);

    constructor(
        @InjectModel(ShiftTemplate.name)
        private shiftTemplateModel: Model<ShiftTemplate>,
        @InjectModel(ShiftOverride.name)
        private shiftOverrideModel: Model<ShiftOverride>,
        @InjectModel(ShiftResolved.name)
        private shiftResolvedModel: Model<ShiftResolved>,
    ) {}

    /**
     * Create a single-day override (replace or cancel)
     */
    async createShiftPlan(
        dto: CreateShiftOverrideBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_shift_plan',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create shift plans",
            );
        }

        if (dto.overrideType === 'replace') {
            if (!dto.shiftStart || !dto.shiftEnd || !dto.shiftType) {
                throw new BadRequestException(
                    'Replace overrides require shiftType, shiftStart, and shiftEnd',
                );
            }
        }

        let crossesMidnight = false;
        if (dto.shiftStart && dto.shiftEnd) {
            const startParts = dto.shiftStart.split(':');
            const endParts = dto.shiftEnd.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
            this.validateShiftTimes(
                dto.shiftStart,
                dto.shiftEnd,
                crossesMidnight,
            );
        }

        try {
            const shiftDate = moment
                .tz(dto.shiftDate, 'Asia/Dhaka')
                .startOf('day')
                .toDate();

            const payload: Partial<ShiftOverride> = {
                employee: dto.employeeId as any,
                shift_date: shiftDate,
                override_type: dto.overrideType,
                shift_type: dto.shiftType,
                shift_start: dto.shiftStart,
                shift_end: dto.shiftEnd,
                crosses_midnight: crossesMidnight,
                updated_by: userSession.db_id,
                change_reason: dto.changeReason || null,
            };

            const created = await this.shiftOverrideModel.findOneAndUpdate(
                { employee: dto.employeeId, shift_date: shiftDate },
                { $set: payload },
                { new: true, upsert: true },
            );

            await this.clearResolvedCache(dto.employeeId, shiftDate, shiftDate);

            return created;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create shift override', err as Error);
            throw new InternalServerErrorException(
                'Unable to create shift plan at this time',
            );
        }
    }

    /**
     * Create shift templates for multiple employees and date range
     */
    async createBulkShiftPlans(
        dto: CreateShiftTemplateBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_shift_plan',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create shift plans",
            );
        }

        // Define standard shift times
        const STANDARD_SHIFTS = {
            morning: { start: '07:00', end: '15:00', crossesMidnight: false },
            evening: { start: '15:00', end: '23:00', crossesMidnight: false },
            night: { start: '23:00', end: '07:00', crossesMidnight: true },
        };

        // Determine shift times
        let shiftStart: string;
        let shiftEnd: string;
        let crossesMidnight: boolean;

        if (dto.shiftType === 'custom') {
            if (!dto.shiftStart || !dto.shiftEnd) {
                throw new BadRequestException(
                    'Custom shifts require shiftStart and shiftEnd',
                );
            }
            shiftStart = dto.shiftStart;
            shiftEnd = dto.shiftEnd;
            // Auto-determine crosses midnight for custom shifts
            const startParts = shiftStart.split(':');
            const endParts = shiftEnd.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
        } else {
            // Use standard shift times
            const standardShift = STANDARD_SHIFTS[dto.shiftType];
            shiftStart = standardShift.start;
            shiftEnd = standardShift.end;
            crossesMidnight = standardShift.crossesMidnight;
        }

        // Validate shift times
        this.validateShiftTimes(shiftStart, shiftEnd, crossesMidnight);

        const fromDate = moment.tz(dto.fromDate, 'Asia/Dhaka').startOf('day');
        const toDate = moment.tz(dto.toDate, 'Asia/Dhaka').startOf('day');

        if (toDate.isBefore(fromDate)) {
            throw new BadRequestException('To date must be after from date');
        }

        try {
            const templates: Partial<ShiftTemplate>[] = [];
            for (const employeeId of dto.employeeIds) {
                const overlap = await this.shiftTemplateModel.findOne({
                    employee: employeeId,
                    active: true,
                    effective_from: { $lte: toDate.toDate() },
                    effective_to: { $gte: fromDate.toDate() },
                });

                if (overlap) {
                    throw new BadRequestException(
                        'Overlapping shift template exists for one or more employees',
                    );
                }

                templates.push({
                    employee: employeeId as any,
                    effective_from: fromDate.toDate(),
                    effective_to: toDate.toDate(),
                    shift_type: dto.shiftType,
                    shift_start: shiftStart,
                    shift_end: shiftEnd,
                    crosses_midnight: crossesMidnight,
                    active: true,
                    updated_by: userSession.db_id,
                    change_reason: dto.changeReason || null,
                });
            }

            const result = await this.shiftTemplateModel.insertMany(templates, {
                ordered: true,
            });

            return {
                created: result.length,
                total: templates.length,
                message: `Created ${result.length} shift template(s)`,
            };
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create shift templates', err);
            throw new InternalServerErrorException(
                'Unable to create shift templates at this time',
            );
        }
    }

    /**
     * Get a shift plan by ID
     */
    async getShiftPlan(id: string) {
        try {
            const shiftTemplate = await this.shiftTemplateModel
                .findById(id)
                .populate('employee', 'real_name e_id department')
                .exec();

            if (!shiftTemplate) {
                throw new NotFoundException('Shift template not found');
            }

            return shiftTemplate;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to fetch shift template', err as Error);
            throw new InternalServerErrorException(
                'Unable to fetch shift template',
            );
        }
    }

    /**
     * Get shift templates for an employee within a date range
     */
    async getEmployeeShiftPlans(
        employeeId: string,
        fromDate?: string,
        toDate?: string,
    ) {
        try {
            const query: QueryShape = { employee: employeeId as any };

            if (fromDate || toDate) {
                const range: any = {};
                if (fromDate) {
                    range.$gte = moment
                        .tz(fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                        .startOf('day')
                        .toDate();
                }
                if (toDate) {
                    range.$lte = moment
                        .tz(toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                        .endOf('day')
                        .toDate();
                }
                if (Object.keys(range).length > 0) {
                    query.effective_from = { $lte: range.$lte || range.$gte };
                    query.effective_to = { $gte: range.$gte || range.$lte };
                }
            }

            const shiftTemplates = await this.shiftTemplateModel
                .find(query)
                .sort({ effective_from: 1 })
                .exec();

            return shiftTemplates;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to fetch employee shift templates',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to fetch shift templates',
            );
        }
    }

    /**
     * Update a shift template
     */
    async updateShiftPlan(
        id: string,
        dto: UpdateShiftTemplateBodyDto,
        userSession: UserSession,
    ) {
        const canUpdate = hasPerm(
            'admin:edit_shift_plan',
            userSession.permissions,
        );
        if (!canUpdate) {
            throw new ForbiddenException(
                "You don't have permission to update shift plans",
            );
        }

        const existing = await this.shiftTemplateModel.findById(id).exec();
        if (!existing) {
            throw new NotFoundException('Shift template not found');
        }

        const startTime = dto.shiftStart || existing.shift_start;
        const endTime = dto.shiftEnd || existing.shift_end;
        let crossesMidnight = existing.crosses_midnight;
        if (startTime && endTime) {
            const startParts = startTime.split(':');
            const endParts = endTime.split(':');
            const startHour = startParts[0] ? parseInt(startParts[0], 10) : 0;
            const endHour = endParts[0] ? parseInt(endParts[0], 10) : 0;
            crossesMidnight = endHour < startHour;
            this.validateShiftTimes(startTime, endTime, crossesMidnight);
        }

        // Validate overlap before applying changes
        const targetActive = dto.active ?? existing.active;
        const targetFrom = dto.fromDate
            ? moment.tz(dto.fromDate, 'Asia/Dhaka').startOf('day').toDate()
            : existing.effective_from;
        const targetTo = dto.toDate
            ? moment.tz(dto.toDate, 'Asia/Dhaka').startOf('day').toDate()
            : existing.effective_to;

        if (targetTo < targetFrom) {
            throw new BadRequestException('To date must be after from date');
        }

        if (targetActive) {
            const overlap = await this.shiftTemplateModel.findOne({
                _id: { $ne: id },
                employee: existing.employee,
                active: true,
                effective_from: { $lte: targetTo },
                effective_to: { $gte: targetFrom },
            });

            if (overlap) {
                throw new BadRequestException(
                    'Update causes overlap with existing active shift template',
                );
            }
        }

        const patch: Partial<ShiftTemplate> = {
            shift_type: dto.shiftType || existing.shift_type,
            shift_start: startTime,
            shift_end: endTime,
            crosses_midnight: crossesMidnight,
            updated_by: userSession.db_id,
            change_reason: dto.changeReason || existing.change_reason,
            active: targetActive,
            effective_from: targetFrom,
            effective_to: targetTo,
        };

        try {
            const updated = await this.shiftTemplateModel
                .findByIdAndUpdate(id, { $set: patch }, { new: true })
                .exec();

            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update shift template',
                );
            }

            await this.clearResolvedCache(
                updated.employee.toString(),
                updated.effective_from,
                updated.effective_to,
            );

            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to update shift template', err as Error);
            throw new InternalServerErrorException(
                'Unable to update shift template at this time',
            );
        }
    }

    /**
     * Search shift plans with filters and pagination
     */
    async searchShiftPlans(
        filters: SearchShiftPlansBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        const canView = hasPerm(
            'admin:view_shift_plan',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view shift plans",
            );
        }

        try {
            const query: QueryShape = {};

            if (filters.employeeId) {
                query.employee = filters.employeeId as any;
            }

            if (filters.fromDate || filters.toDate) {
                const from = filters.fromDate
                    ? moment
                          .tz(filters.fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                          .startOf('day')
                          .toDate()
                    : undefined;
                const to = filters.toDate
                    ? moment
                          .tz(filters.toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                          .endOf('day')
                          .toDate()
                    : undefined;

                if (from && to) {
                    query.effective_from = { $lte: to };
                    query.effective_to = { $gte: from };
                } else if (from) {
                    query.effective_to = { $gte: from };
                } else if (to) {
                    query.effective_from = { $lte: to };
                }
            }

            if (filters.shiftType) {
                query.shift_type = filters.shiftType;
            }

            if (filters.active) {
                query.active = filters.active === 'true';
            }

            if (!pagination.paginated) {
                const records = await this.shiftTemplateModel
                    .find(query)
                    .populate('employee', 'real_name e_id department')
                    .sort({ effective_from: 1 })
                    .exec();
                return records;
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const limit = pagination.itemsPerPage;

            const [items, count] = await Promise.all([
                this.shiftTemplateModel
                    .find(query)
                    .populate('employee', 'real_name e_id department')
                    .sort({ effective_from: 1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                this.shiftTemplateModel.countDocuments(query),
            ]);

            const pageCount = Math.ceil(count / limit);

            return {
                pagination: {
                    count,
                    pageCount,
                },
                items,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to search shift plans', err as Error);
            throw new InternalServerErrorException(
                'Unable to search shift plans at this time',
            );
        }
    }

    /**
     * Clear resolved cache for an employee within a date range
     */
    private async clearResolvedCache(
        employeeId: string,
        fromDate: Date,
        toDate: Date,
    ) {
        await this.shiftResolvedModel.deleteMany({
            employee: employeeId as any,
            shift_date: {
                $gte: moment.tz(fromDate, 'Asia/Dhaka').startOf('day').toDate(),
                $lte: moment.tz(toDate, 'Asia/Dhaka').endOf('day').toDate(),
            },
        });
    }

    /**
     * Resolve a shift for a specific employee and date (cached)
     */
    async resolveShiftForDate(employeeId: string, date: Date) {
        const shiftDate = moment.tz(date, 'Asia/Dhaka').startOf('day').toDate();

        const cached = await this.shiftResolvedModel.findOne({
            employee: employeeId as any,
            shift_date: shiftDate,
        });
        if (cached) return cached;

        const override = await this.shiftOverrideModel.findOne({
            employee: employeeId as any,
            shift_date: shiftDate,
        });

        if (override) {
            if (override.override_type === 'cancel') {
                return null;
            }

            const resolved = await this.shiftResolvedModel.findOneAndUpdate(
                { employee: employeeId as any, shift_date: shiftDate },
                {
                    $set: {
                        employee: employeeId as any,
                        shift_date: shiftDate,
                        shift_type: override.shift_type,
                        shift_start: override.shift_start,
                        shift_end: override.shift_end,
                        crosses_midnight: override.crosses_midnight,
                        source: 'override',
                        override_id: override._id,
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );

            return resolved;
        }

        const template = await this.shiftTemplateModel.findOne({
            employee: employeeId as any,
            active: true,
            effective_from: { $lte: shiftDate },
            effective_to: { $gte: shiftDate },
        });

        if (!template) return null;

        const resolved = await this.shiftResolvedModel.findOneAndUpdate(
            { employee: employeeId as any, shift_date: shiftDate },
            {
                $set: {
                    employee: employeeId as any,
                    shift_date: shiftDate,
                    shift_type: template.shift_type,
                    shift_start: template.shift_start,
                    shift_end: template.shift_end,
                    crosses_midnight: template.crosses_midnight,
                    source: 'template',
                    template_id: template._id,
                    resolved_at: new Date(),
                },
            },
            { new: true, upsert: true },
        );

        return resolved;
    }

    /**
     * Validate shift times
     */
    private validateShiftTimes(
        shiftStart: string,
        shiftEnd: string,
        crossesMidnight?: boolean,
    ): void {
        const startTimeParts = shiftStart.split(':');
        const startHour = startTimeParts[0]
            ? parseInt(startTimeParts[0], 10)
            : 0;
        const startMin = startTimeParts[1]
            ? parseInt(startTimeParts[1], 10)
            : 0;

        const endTimeParts = shiftEnd.split(':');
        const endHour = endTimeParts[0] ? parseInt(endTimeParts[0], 10) : 0;
        const endMin = endTimeParts[1] ? parseInt(endTimeParts[1], 10) : 0;

        if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
            throw new BadRequestException('Invalid shift start time format');
        }

        if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
            throw new BadRequestException('Invalid shift end time format');
        }

        const startTotalMins = startHour * 60 + startMin;
        const endTotalMins = endHour * 60 + endMin;

        // If end < start and crosses_midnight is not set, warn or enforce it
        if (endTotalMins < startTotalMins && !crossesMidnight) {
            throw new BadRequestException(
                'Shift end time is before start time. Set crossesMidnight to true for shifts crossing midnight.',
            );
        }
    }

    async searchOverrides(
        filters: SearchShiftPlansBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        const canView = hasPerm(
            'admin:view_shift_plan',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view shift plans",
            );
        }

        try {
            const query: any = {};

            if (filters.employeeId) {
                query.employee = filters.employeeId;
            }

            if (filters.fromDate || filters.toDate) {
                const from = filters.fromDate
                    ? moment
                          .tz(filters.fromDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                          .startOf('day')
                          .toDate()
                    : undefined;
                const to = filters.toDate
                    ? moment
                          .tz(filters.toDate, 'YYYY-MM-DD', 'Asia/Dhaka')
                          .endOf('day')
                          .toDate()
                    : undefined;

                if (from && to) {
                    query.shift_date = { $gte: from, $lte: to };
                } else if (from) {
                    query.shift_date = { $gte: from };
                } else if (to) {
                    query.shift_date = { $lte: to };
                }
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const limit = pagination.itemsPerPage;

            const [items, count] = await Promise.all([
                this.shiftOverrideModel
                    .find(query)
                    .populate('employee', 'real_name')
                    .sort({ shift_date: -1 }) // Newest first
                    .skip(pagination.paginated ? skip : 0)
                    .limit(pagination.paginated ? limit : 0)
                    .exec(),
                this.shiftOverrideModel.countDocuments(query),
            ]);

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / limit),
                },
                items,
            };
        } catch (err) {
            this.logger.error('Failed to search shift overrides', err as Error);
            throw new InternalServerErrorException(
                'Unable to search shift overrides',
            );
        }
    }

    async deleteOverride(id: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:edit_shift_plan',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete shift overrides",
            );
        }

        const deleted = await this.shiftOverrideModel.findByIdAndDelete(id);
        if (!deleted) throw new NotFoundException('Override not found');

        await this.clearResolvedCache(
            deleted.employee.toString(),
            deleted.shift_date,
            deleted.shift_date,
        );

        return { success: true };
    }
}
