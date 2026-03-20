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
import { ShiftAdjustment } from '@repo/common/models/shift-adjustment.schema';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import { ShiftResolved } from '@repo/common/models/shift-resolved.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import { STANDARD_SHIFTS } from '@repo/common/constants/shift-plan.constant';
import * as moment from 'moment-timezone';
import { FilterQuery, Model, Types } from 'mongoose';
import { toObjectId } from '../../common/utils/id-helpers.utils';
import { BulkDeactivateShiftPlansBodyDto } from './dto/bulk-deactivate-shift-plans.dto';
import { CreateBulkShiftPlanBodyDto } from './dto/create-bulk-shift-plan.dto';
import { CreateShiftAdjustmentBodyDto } from './dto/create-shift-adjustment.dto';
import { SearchShiftPlanBodyDto } from './dto/search-shift-plan.dto';
import { UpdateShiftPlanBodyDto } from './dto/update-shift-plan.dto';

type QueryShape = FilterQuery<ShiftPlan>;

@Injectable()
export class ShiftPlanService {
    private readonly logger = new Logger(ShiftPlanService.name);

    constructor(
        @InjectModel(ShiftPlan.name)
        private shiftPlanModel: Model<ShiftPlan>,
        @InjectModel(ShiftAdjustment.name)
        private shiftAdjustmentModel: Model<ShiftAdjustment>,
        @InjectModel(ShiftResolved.name)
        private shiftResolvedModel: Model<ShiftResolved>,
    ) {}

    /**
     * Create a single-day adjustment (replace or cancel)
     */
    async createShiftAdjustment(
        dto: CreateShiftAdjustmentBodyDto,
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

        if (dto.adjustmentType === 'replace') {
            if (!dto.shiftStart || !dto.shiftEnd || !dto.shiftType) {
                throw new BadRequestException(
                    'Replace adjustments require shiftType, shiftStart, and shiftEnd',
                );
            }
        }

        // 'off_day' adjustments represent off-day overtime entries; shift times are optional and will not be
        // used to mark the day as a regular work shift. Admins can optionally provide a suggested window.

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

            const payload: Partial<ShiftAdjustment> = {
                employee: new Types.ObjectId(dto.employeeId),
                shift_date: shiftDate,
                adjustment_type: dto.adjustmentType,
                shift_type: dto.shiftType,
                shift_start: dto.shiftStart,
                shift_end: dto.shiftEnd,
                crosses_midnight: crossesMidnight,
                updated_by: userSession.db_id,
                comment: dto.comment || null,
                grace_period_minutes: dto.gracePeriodMinutes ?? 10,
            };

            const created = await this.shiftAdjustmentModel.findOneAndUpdate(
                {
                    employee: new Types.ObjectId(dto.employeeId),
                    shift_date: shiftDate,
                },
                { $set: payload },
                { new: true, upsert: true },
            );

            await this.clearResolvedCache(dto.employeeId, shiftDate, shiftDate);

            return created;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to create shift adjustment',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to create shift plan at this time',
            );
        }
    }

    /**
     * Create shift templates for multiple employees and date range
     */
    async createBulkShiftPlans(
        dto: CreateBulkShiftPlanBodyDto,
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

        const employeeObjectIds = dto.employeeIds.map(
            id => toObjectId(id) as Types.ObjectId,
        );

        // 1. Single batched overlap check — replaces N sequential findOne calls
        const conflictingDocs = await this.shiftPlanModel
            .find({
                active: true,
                effective_from: { $lte: toDate.toDate() },
                effective_to: { $gte: fromDate.toDate() },
                employee: { $in: employeeObjectIds },
            })
            .select('employee')
            .lean();

        if (conflictingDocs.length > 0) {
            throw new BadRequestException({
                message:
                    'Some employees already have an active shift plan overlapping this date range.',
                conflictingEmployeeIds: conflictingDocs.map(d =>
                    d.employee.toString(),
                ),
            });
        }

        // 2. ACID transaction — atomicity + race condition safety
        const session = await this.shiftPlanModel.db.startSession();
        try {
            session.startTransaction();

            // Re-check inside the transaction to guard against concurrent inserts
            const raceConflict = await this.shiftPlanModel
                .findOne(
                    {
                        active: true,
                        effective_from: { $lte: toDate.toDate() },
                        effective_to: { $gte: fromDate.toDate() },
                        employee: { $in: employeeObjectIds },
                    },
                    null,
                    { session },
                )
                .lean();

            if (raceConflict) {
                throw new BadRequestException(
                    'A conflict was detected. Another plan may have been created simultaneously. Please retry.',
                );
            }

            const plans: Partial<ShiftPlan>[] = dto.employeeIds.map(
                employeeId =>
                    ({
                        employee: toObjectId(employeeId) as Types.ObjectId,
                        effective_from: fromDate.toDate(),
                        effective_to: toDate.toDate(),
                        shift_type: dto.shiftType,
                        shift_start: shiftStart,
                        shift_end: shiftEnd,
                        crosses_midnight: crossesMidnight,
                        active: true,
                        updated_by: userSession.db_id,
                        comment: dto.comment || null,
                        grace_period_minutes: dto.gracePeriodMinutes ?? 10,
                    }) as Partial<ShiftPlan>,
            );

            const result = await this.shiftPlanModel.insertMany(plans, {
                session,
            });

            await session.commitTransaction();

            return {
                createdCount: result.length,
                message: `Created ${result.length} shift plan(s)`,
            };
        } catch (err: any) {
            await session.abortTransaction();
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to create shift plans', err);
            throw new InternalServerErrorException(
                'Unable to create shift plans at this time',
            );
        } finally {
            await session.endSession();
        }
    }

    /**
     * Get a shift plan by ID
     */
    async getShiftPlan(id: string) {
        try {
            const shiftPlan = await this.shiftPlanModel
                .findById(id)
                .populate('employee', 'real_name e_id department')
                .exec();
            if (!shiftPlan) {
                throw new NotFoundException('Shift plan not found');
            }

            return shiftPlan;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error('Failed to fetch shift plans', err as Error);
            throw new InternalServerErrorException(
                'Unable to fetch shift plans',
            );
        }
    }

    /**
     * Get shift plans for an employee within a date range
     */
    async getEmployeeShiftPlans(
        employeeId: string,
        fromDate?: string,
        toDate?: string,
    ) {
        try {
            const query: QueryShape = {
                employee: new Types.ObjectId(employeeId),
            } as QueryShape;

            if (fromDate || toDate) {
                const range: { $gte?: Date; $lte?: Date } = {};
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

            const shiftPlans = await this.shiftPlanModel
                .find(query)
                .sort({ effective_from: 1 })
                .exec();

            return shiftPlans;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to fetch employee shift plans',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to fetch shift plans',
            );
        }
    }

    /**
     * Update a shift template
     */
    async updateShiftPlan(
        id: string,
        dto: UpdateShiftPlanBodyDto,
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

        const existing = await this.shiftPlanModel.findById(id).exec();
        if (!existing) {
            throw new NotFoundException('Shift plan not found');
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
            const overlap = await this.shiftPlanModel.findOne({
                _id: { $ne: id },
                employee: existing.employee,
                active: true,
                effective_from: { $lte: targetTo },
                effective_to: { $gte: targetFrom },
            });

            if (overlap) {
                throw new BadRequestException(
                    'Update causes overlap with existing active shift plan',
                );
            }
        }

        const patch: Partial<ShiftPlan> = {
            shift_type: dto.shiftType || existing.shift_type,
            shift_start: startTime,
            shift_end: endTime,
            crosses_midnight: crossesMidnight,
            updated_by: userSession.db_id,
            comment: dto.comment !== undefined ? dto.comment : existing.comment,
            active: targetActive,
            effective_from: targetFrom,
            effective_to: targetTo,
            grace_period_minutes:
                dto.gracePeriodMinutes || existing.grace_period_minutes,
        };

        try {
            const updated = await this.shiftPlanModel
                .findByIdAndUpdate(id, { $set: patch }, { new: true })
                .exec();

            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update shift plan',
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
            this.logger.error('Failed to update shift plan', err as Error);
            throw new InternalServerErrorException(
                'Unable to update shift plan at this time',
            );
        }
    }

    /**
     * Search shift plans with filters and pagination
     */
    async searchShiftPlans(
        filters: SearchShiftPlanBodyDto,
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
                    query.effective_from = { $lte: to };
                    query.effective_to = { $gte: from };
                } else if (from) {
                    // Single day match: the plan must be active on this day
                    query.effective_from = { $lte: from };
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

            // Department filter — requires lookup on populated employee doc
            const hasDepartmentFilter = !!filters.department;

            if (!hasDepartmentFilter) {
                // Fast path: no department filter, use simple find
                if (!pagination.paginated) {
                    return await this.shiftPlanModel
                        .find(query)
                        .populate('employee', 'real_name e_id department')
                        .sort({ effective_from: 1 })
                        .exec();
                }

                const skip = (pagination.page - 1) * pagination.itemsPerPage;
                const [items, count] = await Promise.all([
                    this.shiftPlanModel
                        .find(query)
                        .populate('employee', 'real_name e_id department')
                        .sort({ effective_from: 1 })
                        .skip(skip)
                        .limit(pagination.itemsPerPage)
                        .exec(),
                    this.shiftPlanModel.countDocuments(query),
                ]);

                return {
                    pagination: {
                        count,
                        pageCount: Math.ceil(count / pagination.itemsPerPage),
                    },
                    items,
                };
            }

            // Slow path: department filter requires aggregation with $lookup
            const pipeline: any[] = [
                { $match: query },
                {
                    $lookup: {
                        from: 'employees',
                        localField: 'employee',
                        foreignField: '_id',
                        as: 'employee',
                    },
                },
                { $unwind: '$employee' },
                { $match: { 'employee.department': filters.department } },
                { $sort: { effective_from: 1 } },
            ];

            if (!pagination.paginated) {
                return await this.shiftPlanModel
                    .aggregate<ShiftPlan>(pipeline)
                    .exec();
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const [items, countResult] = await Promise.all([
                this.shiftPlanModel
                    .aggregate([
                        ...pipeline,
                        { $skip: skip },
                        { $limit: pagination.itemsPerPage },
                    ])
                    .exec(),
                this.shiftPlanModel
                    .aggregate([...pipeline, { $count: 'total' }])
                    .exec(),
            ]);

            const count = countResult[0]?.total ?? 0;
            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / pagination.itemsPerPage),
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
     * Bulk deactivate shift templates by IDs
     */
    async bulkDeactivate(
        dto: BulkDeactivateShiftPlansBodyDto,
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

        if (!dto.ids || dto.ids.length === 0) {
            throw new BadRequestException('No shift plan IDs provided');
        }

        try {
            const objectIds = dto.ids.map(
                id => toObjectId(id) as Types.ObjectId,
            );

            // Fetch affected plans before update (for cache clearing)
            const plans = await this.shiftPlanModel
                .find({ _id: { $in: objectIds } })
                .select('employee effective_from effective_to')
                .exec();

            const patch: Partial<ShiftPlan> = {
                active: false,
                updated_by: userSession.db_id,
            };
            if (dto.comment !== undefined) {
                patch.comment = dto.comment;
            }

            const result = await this.shiftPlanModel.updateMany(
                { _id: { $in: objectIds } },
                { $set: patch },
            );

            // Clear resolved cache for every affected plan
            await Promise.all(
                plans.map(t =>
                    this.clearResolvedCache(
                        t.employee.toString(),
                        t.effective_from,
                        t.effective_to,
                    ),
                ),
            );

            return {
                deactivated: result.modifiedCount,
                message: `Deactivated ${result.modifiedCount} shift plan(s)`,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to bulk deactivate shift plans',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to bulk deactivate shift plans at this time',
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
            employee: toObjectId(employeeId) as Types.ObjectId,
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
            employee: toObjectId(employeeId) as Types.ObjectId,
            shift_date: shiftDate,
        });
        if (cached) return cached;

        const adjustment = await this.shiftAdjustmentModel.findOne({
            employee: toObjectId(employeeId) as Types.ObjectId,
            shift_date: shiftDate,
        } as FilterQuery<ShiftAdjustment>);

        if (adjustment) {
            if (adjustment.adjustment_type === 'cancel') {
                return null;
            }

            const resolved = await this.shiftResolvedModel.findOneAndUpdate(
                {
                    employee: toObjectId(employeeId) as Types.ObjectId,
                    shift_date: shiftDate,
                } as FilterQuery<ShiftResolved>,
                {
                    $set: {
                        employee: new Types.ObjectId(employeeId),
                        shift_date: shiftDate,
                        shift_type: adjustment.shift_type,
                        shift_start: adjustment.shift_start,
                        shift_end: adjustment.shift_end,
                        crosses_midnight: adjustment.crosses_midnight,
                        source: 'adjustment',
                        adjustment_id: adjustment._id,
                        resolved_at: new Date(),
                    },
                },
                { new: true, upsert: true },
            );

            return resolved;
        }

        const plan = await this.shiftPlanModel.findOne({
            employee: toObjectId(employeeId) as Types.ObjectId,
            active: true,
            effective_from: { $lte: shiftDate },
            effective_to: { $gte: shiftDate },
        });

        if (!plan) return null;

        const resolved = await this.shiftResolvedModel.findOneAndUpdate(
            {
                employee: toObjectId(employeeId) as Types.ObjectId,
                shift_date: shiftDate,
            },
            {
                $set: {
                    employee: toObjectId(employeeId) as Types.ObjectId,
                    shift_date: shiftDate,
                    shift_type: plan.shift_type,
                    shift_start: plan.shift_start,
                    shift_end: plan.shift_end,
                    crosses_midnight: plan.crosses_midnight,
                    source: 'plan',
                    plan_id: plan._id,
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

    async searchAdjustments(
        filters: SearchShiftPlanBodyDto,
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
            const query: FilterQuery<ShiftAdjustment> = {};

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
                this.shiftAdjustmentModel
                    .find(query)
                    .populate('employee', 'real_name')
                    .sort({ shift_date: -1 }) // Newest first
                    .skip(pagination.paginated ? skip : 0)
                    .limit(pagination.paginated ? limit : 0)
                    .exec(),
                this.shiftAdjustmentModel.countDocuments(query),
            ]);

            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / limit),
                },
                items,
            };
        } catch (err) {
            this.logger.error(
                'Failed to search shift adjustments',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to search shift adjustments',
            );
        }
    }

    async deleteAdjustment(id: string, userSession: UserSession) {
        const canDelete = hasPerm(
            'admin:edit_shift_plan',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to delete shift adjustments",
            );
        }

        const deleted = await this.shiftAdjustmentModel.findByIdAndDelete(id);
        if (!deleted) throw new NotFoundException('Adjustment not found');

        await this.clearResolvedCache(
            deleted.employee.toString(),
            deleted.shift_date,
            deleted.shift_date,
        );

        return { success: true };
    }
}
