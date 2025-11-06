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
import mongoose, { FilterQuery, Model, PipelineStage } from 'mongoose';
import { CreateApprovalBodyDto } from './dto/create-approval.dto';
import {
    SearchApprovalsBodyDto,
    SearchApprovalsQueryDto,
} from './dto/search-approvals.dto';
import { ApprovalFactory } from './factories/approval.factory';

type NormalizedApprovalUser = {
    user_id: string | null;
    employee_id: string | null;
    real_name: string | null;
};

type ApprovalWithUsers = Omit<Approval, 'req_by' | 'rev_by'> & {
    req_by: NormalizedApprovalUser | null;
    rev_by: NormalizedApprovalUser | null;
};

interface ApprovalSearchQuery extends Record<string, unknown> {
    createdAt?: { $gte?: Date; $lte?: Date };
    $or?: FilterQuery<Approval>[];
    target_model?: Approval['target_model'];
    action?: Approval['action'];
    req_by?:
        | mongoose.Types.ObjectId
        | null
        | { $in: mongoose.Types.ObjectId[] };
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

        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;
        const {
            reqBy,
            reqType,
            approvedCheck,
            rejectedCheck,
            waitingCheck,
            fromDate,
            toDate,
        } = filters;

        const query: ApprovalSearchQuery = {};

        applyDateRange(query, 'createdAt', fromDate, toDate);

        const statusConditions: FilterQuery<Approval>[] = [];
        if (approvedCheck) statusConditions.push({ status: 'approved' });
        if (rejectedCheck) statusConditions.push({ status: 'rejected' });
        if (waitingCheck) statusConditions.push({ status: 'pending' });
        if (statusConditions.length > 0) {
            query.$or = statusConditions;
        }

        if (reqType) {
            const [modelRaw, actionRaw] = reqType.trim().split(/\s+/);
            const allowedModels: Approval['target_model'][] = [
                'User',
                'Report',
                'Employee',
                'Order',
                'Client',
                'Schedule',
            ];
            const matchingModel = allowedModels.find(
                model => model === modelRaw,
            );
            if (matchingModel) {
                query.target_model = matchingModel;
            }

            const normalizedAction = actionRaw?.toLowerCase();
            const allowedActions: Approval['action'][] = [
                'create',
                'update',
                'delete',
            ];
            const matchingAction = allowedActions.find(
                action => action === normalizedAction,
            );
            if (matchingAction) {
                query.action = matchingAction;
            }
        }

        await this.applyRequesterFilter(query, reqBy);

        const searchQuery: FilterQuery<Approval> = { ...query };

        // if (filtered && Object.keys(searchQuery).length === 0) {
        //     throw new BadRequestException('No filter applied');
        // }

        try {
            const count = await this.approvalModel.countDocuments(searchQuery);
            const skip = Math.max(page - 1, 0) * itemsPerPage;

            if (paginated) {
                const items = await this.aggregateApprovals(
                    searchQuery,
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

            return this.findApprovals(searchQuery);
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to search approvals',
            );
        }
    }

    private async applyRequesterFilter(
        query: ApprovalSearchQuery,
        reqBy?: string,
    ) {
        if (!reqBy) return;
        const nameQuery = createRegexQuery(reqBy);
        if (!nameQuery) {
            query.req_by = { $in: [] };
            return;
        }

        const matchedUsers = await this.userModel
            .aggregate<{ _id: mongoose.Types.ObjectId }>([
                {
                    $lookup: {
                        from: 'employees',
                        localField: 'employee',
                        foreignField: '_id',
                        as: 'employee',
                    },
                },
                {
                    $unwind: {
                        path: '$employee',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        $or: [
                            { username: nameQuery },
                            { 'employee.real_name': nameQuery },
                        ],
                    },
                },
                { $project: { _id: 1 } },
            ])
            .exec();

        const matchedIds = matchedUsers.map(doc => doc._id);
        query.req_by = { $in: matchedIds };
    }

    private buildUserLookupStages(field: 'req_by' | 'rev_by'): PipelineStage[] {
        return [
            {
                $lookup: {
                    from: 'users',
                    let: { userId: `$${field}` },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$userId'] },
                            },
                        },
                        {
                            $lookup: {
                                from: 'employees',
                                localField: 'employee',
                                foreignField: '_id',
                                as: 'employee',
                            },
                        },
                        {
                            $unwind: {
                                path: '$employee',
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                user_id: '$_id',
                                employee_id: '$employee._id',
                                real_name: {
                                    $ifNull: [
                                        '$employee.real_name',
                                        '$username',
                                    ],
                                },
                            },
                        },
                    ],
                    as: field,
                },
            },
            {
                $unwind: {
                    path: `$${field}`,
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];
    }

    private async aggregateApprovals(
        searchQuery: FilterQuery<Approval>,
        skip: number,
        limit: number,
    ): Promise<ApprovalWithUsers[]> {
        const pipeline: PipelineStage[] = [
            { $match: searchQuery },
            ...this.buildUserLookupStages('req_by'),
            ...this.buildUserLookupStages('rev_by'),
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
            { $skip: skip },
            { $limit: limit },
            { $project: { sortPriority: 0 } },
        ];

        const aggregateResult = await this.approvalModel
            .aggregate(pipeline)
            .exec();

        return aggregateResult.map(doc =>
            this.normalizeApprovalDoc(doc as Record<string, unknown>),
        );
    }

    private async findApprovals(
        searchQuery: FilterQuery<Approval>,
    ): Promise<ApprovalWithUsers[]> {
        const docs = await this.approvalModel
            .find(searchQuery)
            .populate({
                path: 'req_by',
                select: 'employee username',
                populate: { path: 'employee', select: 'real_name' },
            })
            .populate({
                path: 'rev_by',
                select: 'employee username',
                populate: { path: 'employee', select: 'real_name' },
            })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        if (!docs) {
            throw new InternalServerErrorException(
                'Failed to retrieve approvals',
            );
        }

        return docs.map(doc =>
            this.normalizeApprovalDoc(doc as Record<string, unknown>),
        );
    }

    private normalizeApprovalDoc(
        doc: Record<string, unknown>,
    ): ApprovalWithUsers {
        const { req_by: rawReqBy, rev_by: rawRevBy, ...rest } = doc;
        return {
            ...(rest as Omit<ApprovalWithUsers, 'req_by' | 'rev_by'>),
            req_by: this.normalizeUserReference(rawReqBy),
            rev_by: this.normalizeUserReference(rawRevBy),
        };
    }

    private normalizeUserReference(
        user: unknown,
    ): NormalizedApprovalUser | null {
        if (!user || typeof user !== 'object') return null;
        const candidate = user as Record<string, unknown>;

        const employeeCandidate = candidate.employee;
        const employeeObject =
            employeeCandidate && typeof employeeCandidate === 'object'
                ? (employeeCandidate as Record<string, unknown>)
                : undefined;

        const resolvedEmployeeId =
            this.toObjectIdString(candidate.employee_id) ??
            this.toObjectIdString(employeeObject?._id) ??
            this.toObjectIdString(candidate.employee);

        const resolvedUserId =
            this.toObjectIdString(candidate.user_id) ??
            this.toObjectIdString(candidate._id);

        let resolvedName: string | null = null;
        if (typeof candidate.real_name === 'string') {
            resolvedName = candidate.real_name;
        } else {
            const employeeName = employeeObject?.real_name;
            if (typeof employeeName === 'string') {
                resolvedName = employeeName;
            } else if (typeof candidate.username === 'string') {
                resolvedName = candidate.username;
            }
        }

        return {
            user_id: resolvedUserId,
            employee_id: resolvedEmployeeId,
            real_name: resolvedName,
        };
    }

    private toObjectIdString(value: unknown): string | null {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toHexString();
        }
        return null;
    }

    async createApproval(
        approvalData: CreateApprovalBodyDto,
        userSession: UserSession,
    ) {
        const allowedTargets: Array<
            'User' | 'Report' | 'Employee' | 'Order' | 'Client' | 'Schedule'
        > = ['User', 'Report', 'Employee', 'Order', 'Client', 'Schedule'];

        if (!allowedTargets.includes(approvalData.target_model)) {
            throw new BadRequestException('Invalid target_model');
        }

        if (!['create', 'update', 'delete'].includes(approvalData.action)) {
            throw new BadRequestException('Invalid action');
        }

        // Validate required fields based on action
        if (approvalData.action === 'create') {
            if (!approvalData.new_data) {
                throw new BadRequestException('new_data is required');
            }
        } else if (approvalData.action === 'update') {
            if (!approvalData.object_id) {
                throw new BadRequestException('object_id is required');
            }
            if (
                !Array.isArray(approvalData.changes) ||
                approvalData.changes.length === 0
            ) {
                throw new BadRequestException('changes array is required');
            }
        } else if (approvalData.action === 'delete') {
            if (!approvalData.object_id) {
                throw new BadRequestException('object_id is required');
            }
            if (!approvalData.deleted_data) {
                throw new BadRequestException('deleted_data is required');
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
    async approveResponse(params: {
        checked_by: string; // reviewer userId
        approval_ids?: string[];
        approval_id?: string;
        reviewerSession: UserSession; // required to enforce reviewer perms
    }) {
        const { checked_by, approval_id, approval_ids, reviewerSession } =
            params;

        // Permission: reviewer must have admin:check_approvals
        if (!hasPerm('admin:check_approvals', reviewerSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to approve requests",
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
                : [approval_id as string];

        // Basic format validation of ObjectIds
        const isValidObjectId = (v: string | undefined) =>
            typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);
        if (!ids.every(isValidObjectId)) {
            throw new BadRequestException('Invalid approval id format');
        }
        if (!isValidObjectId(checked_by)) {
            throw new BadRequestException('Invalid revised by id format');
        }

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
                let resData: any = null;

                switch (approvalData.target_model) {
                    case 'User': {
                        if (approvalData.action === 'create') {
                            // Prevent creating super admin or approving greater perms than reviewer
                            const newUser = approvalData.new_data ?? {};
                            const roleDoc = await this.roleModel
                                .findById(newUser.role)
                                .select('permissions')
                                .lean();
                            const rolePerms = sanitizePermissions(
                                roleDoc?.permissions || [],
                            );
                            const reviewerPerms = reviewerSession.permissions;

                            if (
                                hasPerm(
                                    'settings:the_super_admin',
                                    rolePerms,
                                ) &&
                                !hasPerm(
                                    'settings:the_super_admin',
                                    reviewerPerms,
                                )
                            ) {
                                throw new ForbiddenException(
                                    "You can't approve creating a super admin user",
                                );
                            }
                            const invalid = rolePerms.filter(
                                p => !hasPerm(p, reviewerPerms),
                            );
                            if (invalid.length > 0) {
                                throw new ForbiddenException(
                                    `You tried to approve permissions the reviewer doesn't have: ${invalid.join(', ')}`,
                                );
                            }
                            resData = await this.userModel.create(newUser);
                        } else if (approvalData.action === 'delete') {
                            const target = await this.userModel
                                .findById(approvalData.object_id)
                                .populate('role', '_id name permissions')
                                .lean<PopulatedByRoleUser>();
                            if (!target)
                                throw new NotFoundException('User not found');
                            const targetPerms = sanitizePermissions(
                                target?.role.permissions || [],
                            );
                            if (
                                hasPerm(
                                    'settings:the_super_admin',
                                    targetPerms,
                                ) &&
                                !hasPerm(
                                    'settings:the_super_admin',
                                    reviewerSession.permissions,
                                )
                            ) {
                                throw new ForbiddenException(
                                    "You can't approve deleting a super admin user",
                                );
                            }
                            resData = await this.userModel.findByIdAndDelete(
                                approvalData.object_id,
                            );
                        }
                        break;
                    }
                    case 'Order': {
                        if (approvalData.action === 'delete') {
                            resData = await this.orderModel.findByIdAndDelete(
                                approvalData.object_id as any,
                            );
                        }
                        break;
                    }
                    case 'Client': {
                        if (approvalData.action === 'delete') {
                            resData = await this.clientModel.findByIdAndDelete(
                                approvalData.object_id as any,
                            );
                        }
                        break;
                    }
                    case 'Schedule': {
                        if (approvalData.action === 'delete') {
                            resData =
                                await this.scheduleModel.findByIdAndDelete(
                                    approvalData.object_id as any,
                                );
                        }
                        break;
                    }
                    case 'Report': {
                        if (approvalData.action === 'delete') {
                            resData = await this.reportModel.findByIdAndDelete(
                                approvalData.object_id as any,
                            );
                        } else if (approvalData.action === 'update') {
                            const patch = (approvalData.changes || []).reduce<
                                Record<string, any>
                            >((acc, change: any) => {
                                acc[change.field] = change.newValue;
                                return acc;
                            }, {});
                            resData = await this.reportModel.findByIdAndUpdate(
                                approvalData.object_id as any,
                                patch,
                                { new: true },
                            );
                        }
                        break;
                    }
                    case 'Employee': {
                        if (approvalData.action === 'delete') {
                            resData =
                                await this.employeeModel.findByIdAndDelete(
                                    approvalData.object_id as any,
                                );
                        }
                        break;
                    }
                    default: {
                        const targetModel = String(
                            (approvalData as any).target_model,
                        );
                        const actionStr = String((approvalData as any).action);
                        throw new BadRequestException(
                            `Unsupported request type: ${targetModel} ${actionStr}`,
                        );
                    }
                }

                if (!resData) {
                    return {
                        error: `Failed to process ${approvalData.target_model} ${approvalData.action}`,
                    } as const;
                }

                const updatedApproval =
                    await this.approvalModel.findByIdAndUpdate(
                        id,
                        { status: 'approved', rev_by: checked_by },
                        { new: true },
                    );
                return updatedApproval;
            }),
        );

        const successful: Approval[] = [];
        const errors: string[] = [];
        for (const r of results) {
            if (r.status === 'fulfilled') {
                const v: unknown = r.value;
                if (
                    v &&
                    typeof v === 'object' &&
                    'error' in (v as Record<string, unknown>)
                ) {
                    errors.push(String((v as any).error));
                } else if (v) {
                    successful.push(v as Approval);
                }
            } else {
                errors.push(String(r.reason));
            }
        }

        if (successful.length === 0) {
            throw new BadRequestException(errors.join('; '));
        }

        return {
            successful,
            errors,
            statusCode: errors.length ? 207 : 200,
        } as const;
    }

    /**
     * Reject one or more approval requests.
     */
    async rejectResponse(params: {
        checked_by: string; // reviewer userId
        approval_ids?: string[];
        approval_id?: string;
        reviewerSession: UserSession;
    }) {
        const { checked_by, approval_id, approval_ids, reviewerSession } =
            params;

        if (!hasPerm('admin:check_approvals', reviewerSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to reject requests",
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
                : [approval_id as string];

        const isValidObjectId = (v: string | undefined): v is string =>
            typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);

        if (!ids.every(isValidObjectId)) {
            throw new BadRequestException('Invalid approval id format');
        }
        if (!isValidObjectId(checked_by)) {
            throw new BadRequestException('Invalid revised by id format');
        }

        try {
            // Define the shape of each item that Promise.allSettled will return
            type ApprovalResult = Approval | { error: string };

            const results = await Promise.allSettled<ApprovalResult>(
                ids.map(async id => {
                    const updated = await this.approvalModel.findByIdAndUpdate(
                        id,
                        { status: 'rejected', rev_by: checked_by },
                        { new: true },
                    );
                    if (!updated)
                        return {
                            error: `Approval not found or not updated: ${id}`,
                        };
                    return updated;
                }),
            );

            const successful: Approval[] = [];
            const errors: string[] = [];

            for (const r of results) {
                if (r.status === 'fulfilled') {
                    if ('error' in r.value) {
                        errors.push(r.value.error);
                    } else {
                        successful.push(r.value);
                    }
                } else {
                    errors.push(String(r.reason));
                }
            }

            if (successful.length === 0) {
                throw new BadRequestException(errors.join('; '));
            }

            return {
                successful,
                errors,
                statusCode: errors.length ? 207 : 200,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to reject approvals',
            );
        }
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

        if (response === 'reject') {
            return this.rejectResponse({
                checked_by: reviewedBy,
                approval_id: objectId,
                reviewerSession,
            });
        }
        if (response === 'approve') {
            return this.approveResponse({
                checked_by: reviewedBy,
                approval_id: objectId,
                reviewerSession,
            });
        }
        throw new BadRequestException('Invalid response type');
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
        if (response === 'reject') {
            return this.rejectResponse({
                checked_by: reviewedBy,
                approval_ids: objectIds,
                reviewerSession,
            });
        }
        if (response === 'approve') {
            return this.approveResponse({
                checked_by: reviewedBy,
                approval_ids: objectIds,
                reviewerSession,
            });
        }
        throw new BadRequestException('Invalid response type');
    }
}
