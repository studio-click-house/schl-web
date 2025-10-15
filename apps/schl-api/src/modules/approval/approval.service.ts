import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model, PipelineStage } from 'mongoose';
import { PopulatedUser } from 'src/common/types/populated-user.type';
import { UserSession } from 'src/common/types/user-session.type';
import { applyDateRange } from 'src/common/utils/date-helpers';
import { createRegexQuery } from 'src/common/utils/filter-helpers';
import {
    hasPerm,
    sanitizePermissions,
} from 'src/common/utils/permission-check';
import { Approval } from 'src/models/approval.schema';
import { Client } from 'src/models/client.schema';
import { Employee } from 'src/models/employee.schema';
import { Order } from 'src/models/order.schema';
import { Report } from 'src/models/report.schema';
import { Role } from 'src/models/role.schema';
import { Schedule } from 'src/models/schedule.schema';
import { User } from 'src/models/user.schema';
import { CreateApprovalBodyDto } from './dto/create-approval.dto';
import {
    SearchApprovalsBodyDto,
    SearchApprovalsQueryDto,
} from './dto/search-approvals.dto';
import { ApprovalFactory } from './factories/approval.factory';

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

        const { page, itemsPerPage, filtered, paginated } = pagination;
        const {
            reqBy,
            reqType,
            approvedCheck,
            rejectedCheck,
            waitingCheck,
            fromDate,
            toDate,
        } = filters;

        interface QueryShape extends Record<string, any> {
            createdAt?: { $gte?: Date; $lte?: Date };
            $or?: FilterQuery<Approval>[];
            target_model?: Approval['target_model'];
            action?: Approval['action'];
            req_by?: mongoose.Types.ObjectId | null;
        }

        const query: QueryShape = {};

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

        if (reqBy) {
            const nameQuery = createRegexQuery(reqBy);
            if (!nameQuery) {
                query.req_by = null;
            } else {
                const userDoc = await this.userModel
                    .findOne({ real_name: nameQuery })
                    .select('_id')
                    .lean();
                if (userDoc?._id) {
                    query.req_by = userDoc._id;
                } else {
                    query.req_by = null;
                }
            }
        }

        const searchQuery: FilterQuery<Approval> = { ...query };

        if (filtered && Object.keys(searchQuery).length === 0) {
            throw new BadRequestException('No filter applied');
        }

        const skip = Math.max(page - 1, 0) * itemsPerPage;

        try {
            const count = await this.approvalModel.countDocuments(searchQuery);
            let approvals: Approval[];

            if (paginated) {
                const sortQuery: Record<string, 1 | -1> = {
                    sortPriority: 1,
                    createdAt: -1,
                };

                const pipeline: PipelineStage[] = [
                    { $match: searchQuery },
                    {
                        $lookup: {
                            from: 'users',
                            let: { reqById: '$req_by' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$_id', '$$reqById'] },
                                    },
                                },
                                { $project: { _id: 0, real_name: 1 } },
                            ],
                            as: 'req_by',
                        },
                    },
                    {
                        $unwind: {
                            path: '$req_by',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: { revById: '$rev_by' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ['$_id', '$$revById'] },
                                    },
                                },
                                { $project: { _id: 0, real_name: 1 } },
                            ],
                            as: 'rev_by',
                        },
                    },
                    {
                        $unwind: {
                            path: '$rev_by',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
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
                    { $sort: sortQuery },
                    { $skip: skip },
                    { $limit: itemsPerPage },
                    { $project: { sortPriority: 0 } },
                ];

                approvals = await this.approvalModel.aggregate(pipeline).exec();

                if (!approvals) {
                    throw new InternalServerErrorException(
                        'Failed to retrieve approvals',
                    );
                }

                return {
                    pagination: {
                        count,
                        pageCount: Math.ceil(count / itemsPerPage),
                    },
                    items: approvals,
                };
            }
            approvals = await this.approvalModel
                .find(searchQuery)
                .populate('req_by', 'real_name -_id')
                .populate('rev_by', 'real_name -_id')
                .sort({ createdAt: -1 })
                .lean()
                .exec();

            if (!approvals) {
                throw new InternalServerErrorException(
                    'Failed to retrieve approvals',
                );
            }

            return approvals;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to search approvals',
            );
        }
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
                                .populate('role', 'permissions name')
                                .lean<PopulatedUser>();
                            if (!target)
                                throw new NotFoundException('User not found');
                            const targetPerms = sanitizePermissions(
                                target?.role?.permissions || [],
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
