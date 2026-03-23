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
import { ShiftResolved } from '@repo/common/models/shift-resolved.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import * as moment from 'moment-timezone';
import { FilterQuery, Model, Types } from 'mongoose';
import { toObjectId } from '../../common/utils/id-helpers.utils';
import { BulkDeactivateShiftAdjustmentsBodyDto } from './dto/bulk-deactivate-shift-adjustments.dto';
import { CreateShiftAdjustmentBodyDto } from './dto/create-shift-adjustment.dto';
import { SearchShiftAdjustmentBodyDto } from './dto/search-shift-adjustment.dto';
import { UpdateShiftAdjustmentBodyDto } from './dto/update-shift-adjustment.dto';
import { ShiftAdjustmentFactory } from './factories/shift-adjustment.factory';

@Injectable()
export class ShiftAdjustmentService {
    private readonly logger = new Logger(ShiftAdjustmentService.name);

    constructor(
        @InjectModel(ShiftAdjustment.name)
        private shiftAdjustmentModel: Model<ShiftAdjustment>,
        @InjectModel(ShiftResolved.name)
        private shiftResolvedModel: Model<ShiftResolved>,
    ) {}

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

        if (endTotalMins < startTotalMins && !crossesMidnight) {
            throw new BadRequestException(
                'Shift end time is before start time. Set crossesMidnight to true for shifts crossing midnight.',
            );
        }
    }

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

        const payload = ShiftAdjustmentFactory.fromCreateDto(dto, userSession);

        if (payload.shift_start && payload.shift_end) {
            this.validateShiftTimes(
                payload.shift_start,
                payload.shift_end,
                payload.crosses_midnight,
            );
        }

        try {
            const shiftDate = payload.shift_date as Date;

            const existingAdjustment = await this.shiftAdjustmentModel.findOne({
                employee: payload.employee,
                shift_date: shiftDate,
                active: true,
            });
            if (existingAdjustment) {
                throw new BadRequestException({
                    message:
                        'An adjustment already exists for this employee on this date.',
                    existingAdjustmentId: existingAdjustment._id.toString(),
                });
            }

            const created = await this.shiftAdjustmentModel.create(payload);

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

    async searchAdjustments(
        filters: SearchShiftAdjustmentBodyDto,
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
                query.employee = toObjectId(
                    filters.employeeId,
                ) as Types.ObjectId;
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

            if (filters.adjustmentType) {
                query.adjustment_type = filters.adjustmentType;
            }

            if (filters.active !== undefined) {
                query.active = filters.active === 'true';
            }

            // If no department filter, we can do a simple find
            if (!filters.department) {
                const skip = (pagination.page - 1) * pagination.itemsPerPage;
                const limit = pagination.itemsPerPage;

                if (!pagination.paginated) {
                    return await this.shiftAdjustmentModel
                        .find(query)
                        .populate('employee', 'real_name e_id department')
                        .sort({ shift_date: -1 })
                        .exec();
                }

                const [items, count] = await Promise.all([
                    this.shiftAdjustmentModel
                        .find(query)
                        .populate('employee', 'real_name e_id department')
                        .sort({ shift_date: -1 })
                        .skip(skip)
                        .limit(limit)
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
            }

            // If department filter exists, use aggregation pipeline
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
                { $sort: { shift_date: -1 } },
            ];

            if (!pagination.paginated) {
                return await this.shiftAdjustmentModel
                    .aggregate<ShiftAdjustment>(pipeline)
                    .exec();
            }

            const skip = (pagination.page - 1) * pagination.itemsPerPage;
            const limit = pagination.itemsPerPage;

            const [items, countResult] = await Promise.all([
                this.shiftAdjustmentModel
                    .aggregate([
                        ...pipeline,
                        { $skip: skip },
                        { $limit: limit },
                    ])
                    .exec(),
                this.shiftAdjustmentModel
                    .aggregate([...pipeline, { $count: 'total' }])
                    .exec(),
            ]);

            const count = countResult[0]?.total ?? 0;
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



    async updateAdjustment(
        id: string,
        dto: UpdateShiftAdjustmentBodyDto,
        userSession: UserSession,
    ) {
        const canUpdate = hasPerm(
            'admin:edit_shift_plan',
            userSession.permissions,
        );
        if (!canUpdate) {
            throw new ForbiddenException(
                "You don't have permission to update shift adjustments",
            );
        }

        const existing = await this.shiftAdjustmentModel.findById(id).exec();
        if (!existing) throw new NotFoundException('Adjustment not found');

        const patch = ShiftAdjustmentFactory.fromUpdateDto(
            dto,
            existing,
            userSession,
        );

        const finalStart =
            patch.shift_start !== undefined
                ? patch.shift_start
                : existing.shift_start;
        const finalEnd =
            patch.shift_end !== undefined
                ? patch.shift_end
                : existing.shift_end;
        const finalCrosses =
            patch.crosses_midnight !== undefined
                ? patch.crosses_midnight
                : existing.crosses_midnight;
        if (
            finalStart &&
            finalEnd &&
            (patch.shift_start !== undefined || patch.shift_end !== undefined)
        ) {
            this.validateShiftTimes(finalStart, finalEnd, finalCrosses);
        }

        if (
            patch.shift_date &&
            patch.shift_date.getTime() !== existing.shift_date.getTime()
        ) {
            const conflict = await this.shiftAdjustmentModel.findOne({
                _id: { $ne: id },
                employee: existing.employee,
                shift_date: patch.shift_date,
                active: true,
            });
            if (conflict) {
                throw new BadRequestException(
                    'An adjustment already exists for this employee on the new date.',
                );
            }
        }

        const finalAdjustmentType =
            patch.adjustment_type !== undefined
                ? patch.adjustment_type
                : existing.adjustment_type;
        if (finalAdjustmentType === 'replace') {
            const finalShiftType =
                patch.shift_type !== undefined
                    ? patch.shift_type
                    : existing.shift_type;
            if (!finalStart || !finalEnd || !finalShiftType) {
                throw new BadRequestException(
                    'Replace adjustments require shiftType, shiftStart, and shiftEnd',
                );
            }
        }

        try {
            const updated = await this.shiftAdjustmentModel
                .findByIdAndUpdate(id, { $set: patch }, { new: true })
                .exec();

            if (!updated) {
                throw new InternalServerErrorException(
                    'Failed to update shift adjustment',
                );
            }

            // Clear cache for old and new date
            await this.clearResolvedCache(
                existing.employee.toString(),
                existing.shift_date,
                existing.shift_date,
            );

            if (
                patch.shift_date &&
                patch.shift_date.getTime() !== existing.shift_date.getTime()
            ) {
                await this.clearResolvedCache(
                    existing.employee.toString(),
                    patch.shift_date,
                    patch.shift_date,
                );
            }

            return updated;
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to update shift adjustment',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to update shift adjustment at this time',
            );
        }
    }

    async bulkDeactivateAdjustments(
        dto: BulkDeactivateShiftAdjustmentsBodyDto,
        userSession: UserSession,
    ) {
        const canDelete = hasPerm(
            'admin:edit_shift_plan',
            userSession.permissions,
        );
        if (!canDelete) {
            throw new ForbiddenException(
                "You don't have permission to update shift adjustments",
            );
        }

        if (!dto.ids || dto.ids.length === 0) {
            throw new BadRequestException('No shift adjustment IDs provided');
        }

        try {
            const objectIds = dto.ids.map(
                id => toObjectId(id) as Types.ObjectId,
            );

            // Fetch affected plans before update (for cache clearing)
            const adjustments = await this.shiftAdjustmentModel
                .find({ _id: { $in: objectIds } })
                .select('employee shift_date')
                .exec();

            const patch: Partial<ShiftAdjustment> = {
                active: false,
                updated_by: userSession.db_id,
            };
            if (dto.comment !== undefined) {
                patch.comment = dto.comment;
            }

            const result = await this.shiftAdjustmentModel.updateMany({
                _id: { $in: objectIds },
            }, { $set: patch });

            // Clear resolved cache for every affected adjustment
            await Promise.all(
                adjustments.map(t =>
                    this.clearResolvedCache(
                        t.employee.toString(),
                        t.shift_date,
                        t.shift_date,
                    ),
                ),
            );

            return {
                deactivatedCount: result.modifiedCount,
                message: `Deactivated ${result.modifiedCount} shift adjustment(s)`,
            };
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(
                'Failed to bulk deactivate shift adjustments',
                err as Error,
            );
            throw new InternalServerErrorException(
                'Unable to bulk deactivate shift adjustments at this time',
            );
        }
    }
}
