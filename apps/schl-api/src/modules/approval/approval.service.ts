import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Approval } from '@repo/common/models/approval.schema';
import { Client } from '@repo/common/models/client.schema';
import { Employee } from '@repo/common/models/employee.schema';
import { Order } from '@repo/common/models/order.schema';
import { Report } from '@repo/common/models/report.schema';
import { Role } from '@repo/common/models/role.schema';
import { Schedule } from '@repo/common/models/schedule.schema';
import { User } from '@repo/common/models/user.schema';
import { PopulatedByRoleUser } from '@repo/common/types/populated-user.type';
import { UserSession } from '@repo/common/types/user-session.type';
import { applyDateRange } from '@repo/common/utils/date-helpers';
import { createRegexQuery } from '@repo/common/utils/filter-helpers';
import {
    hasPerm,
    sanitizePermissions,
} from '@repo/common/utils/permission-check';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { CreateApprovalBodyDto } from './dto/create-approval.dto';
import {
    SearchApprovalsBodyDto,
    SearchApprovalsQueryDto,
} from './dto/search-approvals.dto';
import { ApprovalFactory } from './factories/approval.factory';

type QueryShape = FilterQuery<Approval>;

interface ReviewerParams {
    checked_by: string;
    approval_ids?: string[];
    approval_id?: string;
    reviewerSession: UserSession;
}

@Injectable()
export class ApprovalService {
    constructor(
        @InjectModel(Approval.name)
        private readonly approvalModel: Model<Approval>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Role.name)
        private readonly roleModel: Model<Role>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
        @InjectModel(Client.name)
        private readonly clientModel: Model<Client>,
        @InjectModel(Schedule.name)
        private readonly scheduleModel: Model<Schedule>,
        @InjectModel(Report.name)
        private readonly reportModel: Model<Report>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<Employee>,
    ) {}

    async searchApprovals(
        filters: SearchApprovalsBodyDto,
        pagination: SearchApprovalsQueryDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('admin:view_page', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view approvals",
            );
        }

        const { page, itemsPerPage, paginated } = pagination;
        const {
            reqBy,
            reqType,
            approvedCheck,
            rejectedCheck,
            waitingCheck,
            fromDate,
            toDate,
        } = filters;

        const query: QueryShape = {};

        applyDateRange(query, 'createdAt', fromDate, toDate);
        this.applyStatusFilter(
            query,
            approvedCheck,
            rejectedCheck,
            waitingCheck,
        );
        this.applyReqTypeFilter(query, reqType);
        await this.applyRequesterFilter(query, reqBy);

        const skip = (page - 1) * itemsPerPage;

        try {
            if (paginated) {
                const { count, items } = await this.aggregatePaginatedApprovals(
                    query,
                    skip,
                    itemsPerPage,
                );
                return {
                    pagination: {
                        count,
                        pageCount: Math.ceil(count / itemsPerPage),
                    },
                    items,
                };
            }

            return this.findApprovals(query);
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to search approvals',
            );
        }
    }

    private applyStatusFilter(
        query: QueryShape,
        approved?: boolean,
        rejected?: boolean,
        waiting?: boolean,
    ) {
        const statusFilters: Approval['status'][] = [];
        if (approved) statusFilters.push('approved');
        if (rejected) statusFilters.push('rejected');
        if (waiting) statusFilters.push('pending');
        if (statusFilters.length > 0) {
            query.status = { $in: statusFilters };
        }
    }

    private applyReqTypeFilter(query: QueryShape, reqType?: string) {
        if (!reqType) return;

        const [modelRaw, actionRaw] = reqType.trim().split(/\s+/);
        const allowedModels: Approval['target_model'][] = [
            'User',
            'Report',
            'Employee',
            'Order',
            'Client',
            'Schedule',
        ];
        const matchingModel = allowedModels.find(m => m === modelRaw);
        if (matchingModel) query.target_model = matchingModel;

        const normalizedAction = actionRaw?.toLowerCase();
        const allowedActions: Approval['action'][] = [
            'create',
            'update',
            'delete',
        ];
        const matchingAction = allowedActions.find(a => a === normalizedAction);
        if (matchingAction) query.action = matchingAction;
    }

    private async applyRequesterFilter(query: QueryShape, reqBy?: string) {
        if (!reqBy) return;

        const trimmedReqBy = reqBy.trim();
        if (mongoose.Types.ObjectId.isValid(trimmedReqBy)) {
            query.req_by = new mongoose.Types.ObjectId(trimmedReqBy);
            return;
        }

        const nameQuery = createRegexQuery(reqBy);
        if (!nameQuery) {
            query.req_by = { $in: [] };
            return;
        }

        const [usersByUsername, employeesByName] = await Promise.all([
            this.userModel.find({ username: nameQuery }).select('_id').lean(),
            this.employeeModel
                .find({ real_name: nameQuery })
                .select('_id')
                .lean(),
        ]);

        const employeeIds = employeesByName.map(doc => doc._id);

        const usersByEmployee =
            employeeIds.length > 0
                ? await this.userModel
                      .find({ employee: { $in: employeeIds } })
                      .select('_id')
                      .lean()
                : [];

        const seen = new Set<string>();
        const matchedIds: mongoose.Types.ObjectId[] = [];
        for (const doc of [...usersByUsername, ...usersByEmployee]) {
            const hex = doc._id.toHexString();
            if (!seen.has(hex)) {
                seen.add(hex);
                matchedIds.push(doc._id);
            }
        }

        query.req_by = { $in: matchedIds };
    }

    private buildUserLookupStages(field: 'req_by' | 'rev_by') {
        return [
            {
                $lookup: {
                    from: 'users',
                    localField: field,
                    foreignField: '_id',
                    as: field,
                },
            },
            {
                $unwind: {
                    path: `$${field}`,
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: `${field}.employee`,
                    foreignField: '_id',
                    as: `${field}_employee`,
                },
            },
            {
                $unwind: {
                    path: `$${field}_employee`,
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    [`${field}_name`]: {
                        $ifNull: [
                            `$${field}_employee.real_name`,
                            `$${field}.username`,
                        ],
                    },
                },
            },
            {
                $project: {
                    [`${field}_employee`]: 0,
                },
            },
        ];
    }

    private async aggregatePaginatedApprovals(
        query: QueryShape,
        skip: number,
        limit: number,
    ) {
        const pipeline: any[] = [
            { $match: query },
            {
                $addFields: {
                    sortPriority: {
                        $cond: {
                            if: { $eq: ['$status', 'pending'] },
                            then: 0,
                            else: 1,
                        },
                    },
                },
            },
            { $sort: { sortPriority: 1, createdAt: -1 } },
            {
                $facet: {
                    items: [
                        { $skip: skip },
                        { $limit: limit },
                        ...this.buildUserLookupStages('req_by'),
                        ...this.buildUserLookupStages('rev_by'),
                        { $project: { sortPriority: 0 } },
                    ],
                    count: [{ $count: 'total' }],
                },
            },
        ];

        const [result] = await this.approvalModel.aggregate(pipeline).exec();
        const items = result?.items || [];
        const count = result?.count?.[0]?.total || 0;

        return { count, items };
    }

    private async findApprovals(query: QueryShape): Promise<Approval[]> {
        const pipeline: any[] = [
            { $match: query },
            { $sort: { createdAt: -1 } },
            ...this.buildUserLookupStages('req_by'),
            ...this.buildUserLookupStages('rev_by'),
        ];

        const items: Approval[] = await this.approvalModel
            .aggregate(pipeline)
            .exec();
        if (!items) {
            throw new InternalServerErrorException(
                'Failed to retrieve approvals',
            );
        }

        return items;
    }

    async createApproval(
        approvalData: CreateApprovalBodyDto,
        userSession: UserSession,
    ) {
        const allowedTargets: Array<
            'User' | 'Report' | 'Employee' | 'Order' | 'Client' | 'Schedule'
        > = ['User', 'Report', 'Employee', 'Order', 'Client', 'Schedule'];

        if (!allowedTargets.includes(approvalData.targetModel)) {
            throw new BadRequestException('Invalid targetModel');
        }

        if (!['create', 'update', 'delete'].includes(approvalData.action)) {
            throw new BadRequestException('Invalid action');
        }

        // Validate required fields based on action
        if (approvalData.action === 'create') {
            if (!approvalData.newData) {
                throw new BadRequestException('newData is required');
            }
        } else if (approvalData.action === 'update') {
            if (!approvalData.objectId) {
                throw new BadRequestException('objectId is required');
            }
            if (
                !Array.isArray(approvalData.changes) ||
                approvalData.changes.length === 0
            ) {
                throw new BadRequestException('changes array is required');
            }
        } else if (approvalData.action === 'delete') {
            if (!approvalData.objectId) {
                throw new BadRequestException('objectId is required');
            }
            if (!approvalData.deletedData) {
                throw new BadRequestException('deletedData is required');
            }
        }

        try {
            const payload = ApprovalFactory.fromCreateDto(
                approvalData,
                userSession.db_id,
            );
            const created = await this.approvalModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create approval',
                );
            }
            return created;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to create approval');
        }
    }

    /**
     * Approve one or more approval requests and apply the underlying change.
     */
    async approveResponse(params: ReviewerParams) {
        const { checked_by, reviewerSession } = params;
        const ids = this.validateAndResolveIds(params, 'approve');

        const results = await Promise.allSettled(
            ids.map(async id => {
                const approvalData = await this.approvalModel
                    .findById(id)
                    .lean();
                if (!approvalData) {
                    throw new NotFoundException(
                        `Approval request not found for ID: ${id}`,
                    );
                }

                const resData = await this.executeApprovalAction(
                    approvalData,
                    reviewerSession,
                );
                if (!resData) {
                    throw new BadRequestException(
                        `Failed to process ${approvalData.target_model} ${approvalData.action}`,
                    );
                }

                const updated = await this.approvalModel.findByIdAndUpdate(
                    id,
                    { status: 'approved', rev_by: checked_by },
                    { new: true },
                );
                if (!updated) {
                    throw new NotFoundException(`Approval not updated: ${id}`);
                }
                return updated;
            }),
        );

        return this.collectSettledResults(results);
    }

    /**
     * Reject one or more approval requests.
     */
    async rejectResponse(params: ReviewerParams) {
        const { checked_by } = params;
        const ids = this.validateAndResolveIds(params, 'reject');

        const results = await Promise.allSettled(
            ids.map(async id => {
                const updated = await this.approvalModel.findByIdAndUpdate(
                    id,
                    { status: 'rejected', rev_by: checked_by },
                    { new: true },
                );
                if (!updated) {
                    throw new NotFoundException(
                        `Approval not found or not updated: ${id}`,
                    );
                }
                return updated;
            }),
        );

        return this.collectSettledResults(results);
    }

    /**
     * Handle a single approval response by delegating to approve/reject handlers.
     */
    async handleSingleResponse(params: {
        objectId: string;
        response: 'reject' | 'approve';
        reviewedBy: string;
        reviewerSession: UserSession;
    }) {
        const { objectId, response, reviewedBy, reviewerSession } = params;
        return this.dispatchResponse(response, {
            checked_by: reviewedBy,
            approval_id: objectId,
            reviewerSession,
        });
    }

    /**
     * Handle multiple approval responses in one call.
     */
    async bulkResponse(params: {
        objectIds?: string[];
        response: 'reject' | 'approve';
        reviewedBy: string;
        reviewerSession: UserSession;
    }) {
        const { objectIds, response, reviewedBy, reviewerSession } = params;
        if (
            !Array.isArray(objectIds) ||
            objectIds.length === 0 ||
            !response ||
            !reviewedBy
        ) {
            throw new BadRequestException('Invalid body data');
        }
        return this.dispatchResponse(response, {
            checked_by: reviewedBy,
            approval_ids: objectIds,
            reviewerSession,
        });
    }

    // ── Shared helpers ──────────────────────────────────────────

    private dispatchResponse(
        response: 'reject' | 'approve',
        params: ReviewerParams,
    ) {
        if (response === 'approve') return this.approveResponse(params);
        if (response === 'reject') return this.rejectResponse(params);
        throw new BadRequestException('Invalid response type');
    }

    /**
     * Validate permission, resolve IDs from single/array, and check format.
     */
    private validateAndResolveIds(
        params: ReviewerParams,
        action: 'approve' | 'reject',
    ): string[] {
        const { checked_by, approval_id, approval_ids, reviewerSession } =
            params;

        if (!hasPerm('admin:check_approvals', reviewerSession.permissions)) {
            throw new ForbiddenException(
                `You don't have permission to ${action} requests`,
            );
        }

        if (
            (!Array.isArray(approval_ids) || approval_ids.length === 0) &&
            !approval_id
        ) {
            throw new BadRequestException('No approval ID provided');
        }

        const ids =
            approval_ids && approval_ids.length > 0
                ? approval_ids
                : [approval_id!];

        const isValidId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
        if (!ids.every(isValidId)) {
            throw new BadRequestException('Invalid approval id format');
        }
        if (!isValidId(checked_by)) {
            throw new BadRequestException('Invalid revised by id format');
        }

        return ids;
    }

    /**
     * Process Promise.allSettled results into a unified response.
     */
    private collectSettledResults(
        results: PromiseSettledResult<Approval | null>[],
    ) {
        const successful: Approval[] = [];
        const errors: string[] = [];

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                successful.push(r.value);
            } else if (r.status === 'rejected') {
                errors.push(
                    r.reason instanceof Error
                        ? r.reason.message
                        : String(r.reason),
                );
            }
        }

        if (successful.length === 0 && errors.length > 0) {
            throw new BadRequestException(errors.join('; '));
        }

        return {
            successful,
            errors,
            statusCode: errors.length ? 207 : 200,
        };
    }

    /**
     * Execute the underlying data mutation for an approved request.
     */
    private async executeApprovalAction(
        approvalData: Approval,
        reviewerSession: UserSession,
    ) {
        const { target_model, action, object_id } = approvalData;

        // User model has special permission-guarded logic
        if (target_model === 'User') {
            return this.executeUserAction(approvalData, reviewerSession);
        }

        // Report update builds a patch from changes
        if (target_model === 'Report' && action === 'update') {
            const patch: Record<string, unknown> = {};
            for (const change of approvalData.changes) {
                patch[change.field] = change.newValue;
            }
            return this.reportModel.findByIdAndUpdate(object_id, patch, {
                new: true,
            });
        }

        // All remaining supported actions are deletes
        if (action === 'delete') {
            const result = await this.deleteByTargetModel(
                target_model,
                object_id,
            );
            if (result) return result;
        }

        throw new BadRequestException(
            `Unsupported request type: ${target_model} ${action}`,
        );
    }

    private async executeUserAction(
        approvalData: Approval,
        reviewerSession: UserSession,
    ) {
        const reviewerPerms = reviewerSession.permissions;

        if (approvalData.action === 'create') {
            const newUser = approvalData.new_data ?? {};
            const roleDoc = await this.roleModel
                .findById(newUser.role)
                .select('permissions')
                .lean();
            const rolePerms = sanitizePermissions(roleDoc?.permissions || []);

            if (
                hasPerm('settings:the_super_admin', rolePerms) &&
                !hasPerm('settings:the_super_admin', reviewerPerms)
            ) {
                throw new ForbiddenException(
                    "You can't approve creating a super admin user",
                );
            }
            const invalid = rolePerms.filter(p => !hasPerm(p, reviewerPerms));
            if (invalid.length > 0) {
                throw new ForbiddenException(
                    `You tried to approve permissions the reviewer doesn't have: ${invalid.join(', ')}`,
                );
            }
            return this.userModel.create(newUser);
        }

        if (approvalData.action === 'delete') {
            const target = await this.userModel
                .findById(approvalData.object_id)
                .populate('role', '_id name permissions')
                .lean<PopulatedByRoleUser>();
            if (!target) throw new NotFoundException('User not found');
            const targetPerms = sanitizePermissions(
                target.role.permissions || [],
            );
            if (
                hasPerm('settings:the_super_admin', targetPerms) &&
                !hasPerm('settings:the_super_admin', reviewerPerms)
            ) {
                throw new ForbiddenException(
                    "You can't approve deleting a super admin user",
                );
            }
            return this.userModel.findByIdAndDelete(approvalData.object_id);
        }

        return null;
    }

    private deleteByTargetModel(
        targetModel: Approval['target_model'],
        objectId: mongoose.Types.ObjectId | null,
    ) {
        switch (targetModel) {
            case 'Order':
                return this.orderModel.findByIdAndDelete(objectId);
            case 'Client':
                return this.clientModel.findByIdAndDelete(objectId);
            case 'Schedule':
                return this.scheduleModel.findByIdAndDelete(objectId);
            case 'Report':
                return this.reportModel.findByIdAndDelete(objectId);
            case 'Employee':
                return this.employeeModel.findByIdAndDelete(objectId);
            default:
                return null;
        }
    }
}
