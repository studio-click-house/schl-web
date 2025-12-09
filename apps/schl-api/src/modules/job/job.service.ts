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
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
    FileCondition,
    FileStatus,
    JobSelectionType,
} from '@repo/common/constants/order.constant';
import { Client } from '@repo/common/models/client.schema';
import { Order } from '@repo/common/models/order.schema';
import { User } from '@repo/common/models/user.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    addIfDefined,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { normalizeFolderPath } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import mongoose, { Model } from 'mongoose';
import { NewJobBodyDto } from '../order/dto/new-job.dto';
import { QnapService } from '../qnap/qnap.service';
import {
    ACTIVE_FILE_STATUSES,
    SearchJobsBodyDto,
    type ActiveFileStatus,
    type SearchJobsQueryDto,
} from './dto/search-jobs.dto';
import {
    deriveJobType,
    escapeRegex,
    getCandidateSuffix,
    joinPath,
    mapFolderPathToQnapPath,
    mapJobTypeFilters,
    moveFilesForNewJob,
} from './job.utils';

type SearchJobAggregateItem = {
    orderId: mongoose.Types.ObjectId;
    client_code?: string;
    client_name?: string;
    folder?: string;
    folder_path?: string;
    order_type?: string;
    order_status?: string;
    progress_category?: string;
    progress_is_qc?: boolean;
    progress_qc_step?: number | null;
    progress_shift?: string;
    file_name?: string;
    file_status?: ActiveFileStatus | FileStatus;
    start_timestamp?: Date;
    end_timestamp?: Date | null;
    pause_start_timestamp?: Date | null;
    total_pause_duration?: number;
    transferred_from?: mongoose.Types.ObjectId | null;
};

type SearchJobResponseItem = SearchJobAggregateItem & {
    job_type: JobSelectionType;
};

@Injectable()
export class JobService {
    private readonly logger = new Logger(JobService.name);
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(Client.name) private readonly clientModel: Model<Client>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly configService: ConfigService,
        private readonly qnapService: QnapService,
    ) {}

    // Resolve the employee ObjectId for the current user session
    private async resolveEmployeeId(userSession: UserSession) {
        const user = await this.userModel
            .findById(userSession.db_id)
            .select('employee')
            .lean<{ employee?: mongoose.Types.ObjectId }>()
            .exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (!user.employee) {
            throw new ForbiddenException('Employee not linked to user');
        }

        return new mongoose.Types.ObjectId(String(user.employee));
    }

    // Portal: Add a new progress entry to existing order (identified by clientCode + folderPath)
    async newJob(payload: NewJobBodyDto, userSession: UserSession) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to get new jobs",
            );
        }

        const employeeId = await this.resolveEmployeeId(userSession);

        const clientCode = String(payload.clientCode || '').trim();
        if (!clientCode)
            throw new BadRequestException('Client code is required');

        const folderPath = String(payload.folderPath || '').trim();
        if (!folderPath)
            throw new BadRequestException('Folder path is required');

        const fileNames = Array.isArray(payload.fileNames)
            ? payload.fileNames
                  .map(fn => String(fn || '').trim())
                  .filter(Boolean)
            : [];
        if (fileNames.length === 0) {
            throw new BadRequestException('At least one file is required');
        }

        const normalizedType = String(payload.jobType || '')
            .trim()
            .toLowerCase();
        const normalizedCondition = String(payload.fileCondition || '')
            .trim()
            .toLowerCase();
        const category = normalizedType.startsWith('qc')
            ? 'qc'
            : normalizedType.startsWith('correction')
              ? 'correction'
              : 'production';

        const session = await this.orderModel.db.startSession();
        session.startTransaction();
        try {
            const existing = await this.orderModel
                .findOne({ client_code: clientCode, folder_path: folderPath })
                .session(session)
                .exec();
            if (!existing) throw new NotFoundException('Order not found');

            // Filter out files that are already in-progress in this order
            const occupiedStatuses = new Set([
                'working',
                'paused',
                'transferred',
            ]);
            const occupiedSet = new Set<string>();
            if (existing && Array.isArray(existing.progress)) {
                for (const p of existing.progress) {
                    if (!Array.isArray(p.files_tracking)) continue;
                    for (const ft of p.files_tracking) {
                        if (
                            ft &&
                            typeof ft.file_name === 'string' &&
                            occupiedStatuses.has(ft.status)
                        ) {
                            occupiedSet.add(String(ft.file_name));
                        }
                    }
                }
            }
            let filteredFileNames = fileNames.filter(f => !occupiedSet.has(f));
            // Cross-order check: exclude files that are already assigned to other orders
            if (filteredFileNames.length > 0) {
                const searchQuery: Record<string, any> = {
                    'progress.files_tracking': {
                        $elemMatch: {
                            file_name: { $in: filteredFileNames },
                            status: { $in: Array.from(occupiedStatuses) },
                        },
                    },
                };
                if (existing && existing._id) {
                    searchQuery._id = { $ne: existing._id };
                }
                const otherOccupiedOrders = await this.orderModel
                    .find(searchQuery)
                    .session(session)
                    .lean()
                    .exec();
                if (otherOccupiedOrders && otherOccupiedOrders.length > 0) {
                    const otherOccupiedSet = new Set<string>();
                    for (const o of otherOccupiedOrders) {
                        if (!Array.isArray(o.progress)) continue;
                        for (const p of o.progress) {
                            if (!Array.isArray(p.files_tracking)) continue;
                            for (const ft of p.files_tracking) {
                                if (
                                    ft &&
                                    typeof ft.file_name === 'string' &&
                                    occupiedStatuses.has(ft.status)
                                ) {
                                    otherOccupiedSet.add(String(ft.file_name));
                                }
                            }
                        }
                    }
                    filteredFileNames = filteredFileNames.filter(
                        f => !otherOccupiedSet.has(f),
                    );
                }
            }
            if (filteredFileNames.length === 0) {
                throw new ConflictException(
                    'All requested files are already in progress',
                );
            }

            const now = new Date();
            const fileStatus = payload.isActive ? 'working' : 'paused';
            const filesTracking = filteredFileNames.map(f => ({
                file_name: f,
                start_timestamp: now,
                end_timestamp: null,
                status: fileStatus,
                total_pause_duration: 0,
                // If the employee does not want to start immediately, mark pause start
                pause_start_timestamp: fileStatus === 'paused' ? now : null,
                transferred_from: null,
            }));

            const progressEntry: Record<string, any> = {
                employee: employeeId,
                shift: payload.shift,
                category: category,
                is_qc: category === 'qc',
                qc_step: category === 'qc' ? Number(payload.qcStep) : null,
                files_tracking: filesTracking,
            };

            const update: Record<string, any> = {
                $push: { progress: progressEntry },
                $set: { updated_by: userSession.real_name ?? null },
            };
            const updated = await this.orderModel
                .findByIdAndUpdate(existing._id, update, {
                    new: true,
                    session,
                })
                .exec();
            if (!updated)
                throw new InternalServerErrorException(
                    'Failed to update order',
                );

            try {
                await moveFilesForNewJob({
                    folderPath,
                    normalizedType,
                    normalizedCondition,
                    qcStep: payload.qcStep,
                    employeeName: userSession.real_name || 'employee',
                    fileNames: filteredFileNames,
                    driveMap: this.configService.get<string>('QNAP_DRIVE_MAP'),
                    qnapService: this.qnapService,
                    logger: this.logger,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                throw new InternalServerErrorException(
                    `File move failed, no progress was added: ${msg}`,
                );
            }

            await session.commitTransaction();
            const skippedFiles = fileNames.filter(
                f => !filteredFileNames.includes(f),
            );
            return { order: updated, skippedFiles };
        } catch (e) {
            await session.abortTransaction();
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to update order');
        } finally {
            await session.endSession();
        }
    }

    async availableOrders(
        jobType: string,
        userSession: UserSession,
        clientCode?: string,
    ) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view available jobs",
            );
        }

        const query: Record<string, any> = {};
        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, { exact: true }),
        );

        switch (jobType) {
            case 'General':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;

            case 'Test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;

            case 'QC - General':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;

            case 'QC - Test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;

            case 'Correction - General':
                query.type = createRegexQuery('general', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;

            case 'Correction - Test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;

            default:
                throw new BadRequestException('Invalid job type selected');
        }

        const items = await this.orderModel
            .find(query)
            .select(
                'client_code folder folder_path _id task quantity production',
            )
            .sort({ download_date: 1 })
            .lean()
            .exec();

        return items || [];
    }

    async availableFolders(
        jobType: string,
        userSession: UserSession,
        clientCode?: string,
    ) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view available jobs",
            );
        }

        const query: Record<string, any> = {};
        addIfDefined(
            query,
            'client_code',
            createRegexQuery(clientCode, { exact: true }),
        );

        switch (String(jobType || '').toLowerCase()) {
            case 'general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;
            case 'test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $lt: ['$production', '$quantity'] };
                break;
            case 'qc_general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;
            case 'qc_test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = { $nin: ['finished', 'correction'] };
                query.$expr = { $eq: ['$production', '$quantity'] };
                break;
            case 'correction_general':
                query.type = createRegexQuery('general', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;
            case 'correction_test':
                query.type = createRegexQuery('test', { exact: true });
                query.status = createRegexQuery('correction', { exact: true });
                break;
            default:
                break;
        }

        const pipeline = [
            { $match: query },
            {
                $group: {
                    _id: '$folder_path',
                    folder_name: { $first: '$folder' },
                    client_code: { $first: '$client_code' },
                    orderId: { $first: '$_id' },
                    quantity: { $first: '$quantity' },
                    production: { $first: '$production' },
                },
            },
            {
                $project: {
                    _id: 0,
                    folder_path: '$_id',
                    folder_name: 1,
                    client_code: 1,
                    orderId: 1,
                    quantity: 1,
                    production: 1,
                },
            },
            { $sort: { folder_name: 1 as const } },
        ];

        const groups = (await this.orderModel
            .aggregate(pipeline)
            .exec()) as Array<Record<string, any>>;
        const folders = (groups || []).map((g: Record<string, any>) => {
            const { displayPath, folderKey } = normalizeFolderPath(
                String(g.folder_path || ''),
            );
            return {
                folder_path: g.folder_path,
                folder_name: g.folder_name,
                client_code: g.client_code,
                orderId: g.orderId,
                quantity: g.quantity,
                production: g.production,
                display_path: displayPath,
                folder_key: folderKey,
            };
        });

        return folders;
    }

    async availableFiles(
        folderPath: string,
        jobType: JobSelectionType,
        fileCondition: FileCondition,
        qcStep: number = 1,
    ): Promise<string[]> {
        const normalizedType = jobType.trim().toLowerCase();
        const normalizedCondition = fileCondition.trim().toLowerCase();
        const rawPath = String(folderPath || '').trim();
        if (!rawPath) return [];

        const occupiedStatuses = ['working', 'paused', 'transferred'];

        // Candidate suffix for the selected jobType and condition
        const candidateSuffix = getCandidateSuffix(
            String(normalizedType),
            String(normalizedCondition),
            Number(qcStep || 1),
        );

        const rawCandidatePath = joinPath(rawPath, candidateSuffix);
        const mappedCandidate = mapFolderPathToQnapPath(
            rawCandidatePath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );
        const mappedBase = mapFolderPathToQnapPath(
            rawPath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );

        const occPipeline = [
            {
                $match: {
                    $or: [
                        { folder_path: { $in: [rawPath, rawCandidatePath] } },
                        { folder_path: { $in: [mappedBase, mappedCandidate] } },
                        // Match any subfolders under candidate path (for QC/Done employee folders)
                        {
                            folder_path: {
                                $regex: `^${escapeRegex(mappedCandidate)}/`,
                            },
                        },
                        {
                            folder_path: {
                                $regex: `^${escapeRegex(rawCandidatePath)}/`,
                            },
                        },
                    ],
                },
            },
            { $unwind: '$progress' },
            { $unwind: '$progress.files_tracking' },
            {
                $match: {
                    'progress.files_tracking.status': { $in: occupiedStatuses },
                },
            },
            {
                $group: {
                    _id: null,
                    files: { $addToSet: '$progress.files_tracking.file_name' },
                },
            },
        ];

        const occRes = await this.orderModel.aggregate(occPipeline).exec();
        const occFiles =
            Array.isArray(occRes) &&
            occRes.length > 0 &&
            Array.isArray(occRes[0].files)
                ? (occRes[0].files as string[])
                : [];
        const occupiedSet = new Set<string>(occFiles);

        const filesSet = new Set<string>();
        const parseQnapResponse = (
            resp: any,
        ): Array<{ name: string; isFolder?: boolean }> => {
            if (!resp) return [];
            const candidates: unknown[] = [];
            const collectArrays = (obj: unknown) => {
                if (obj === null || obj === undefined) return;
                if (Array.isArray(obj)) {
                    candidates.push(obj);
                    return;
                }
                if (typeof obj !== 'object') return;
                for (const k of Object.keys(obj as Record<string, any>)) {
                    collectArrays((obj as Record<string, any>)[k]);
                }
            };
            collectArrays(resp);
            for (const arr of candidates) {
                if (!Array.isArray(arr)) continue;
                for (const e of arr) {
                    if (!e) continue;
                    if (typeof e === 'string') {
                        const n = String(e || '').trim();
                        if (!n) continue;
                        filesSet.add(n);
                        continue;
                    }
                    if (typeof e !== 'object') continue;
                    const hasAttrs =
                        e.name || e.FileName || e.fileName || e.File; // qnap's old format
                    if (hasAttrs) {
                        const name =
                            e.name || e.FileName || e.fileName || e.File || '';
                        // const isFolder = Boolean(e.isFolder || e.IsFolder || e.is_dir);
                        if (typeof name === 'string') {
                            filesSet.add(name);
                            continue;
                        }
                    }
                }
            }
            return [];
        };

        const qnapBase = mapFolderPathToQnapPath(
            rawPath,
            this.configService.get<string>('QNAP_DRIVE_MAP'),
        );
        try {
            const targetPath = joinPath(qnapBase, candidateSuffix);
            // Special-case QC fresh: we need to drill into employee subfolders under PRODUCTION/DONE
            if (
                normalizedType.startsWith('qc') &&
                normalizedCondition === 'fresh'
            ) {
                // ... rest omitted for brevity in commit
            }
            // Generic path listing for others (or QC when condition == 'incomplete')
            this.logger.debug(`Calling QNAP path: ${targetPath}`);
            const resp = await this.qnapService.listFolderContents({
                path: targetPath,
                limit: 20000,
            });
            const entries = parseQnapResponse(resp);
            for (const e of entries) {
                if (e.isFolder) continue;
                const n = (e.name || '').replace(/\r|\n/g, '').trim();
                if (!n) continue;
                if (!occupiedSet.has(n)) {
                    filesSet.add(n);
                }
            }
            return Array.from(filesSet);
        } catch (err) {
            this.logger.error('getAvailableFiles failed', err as any);
            return [];
        }
    }

    async searchJobs(
        filters: SearchJobsBodyDto,
        pagination: SearchJobsQueryDto,
        userSession: UserSession,
    ) {
        if (!hasPerm('job:get_jobs', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to view available jobs",
            );
        }

        const { page, itemsPerPage, paginated } = pagination;
        const { folder, folderPath, fileStatus, jobType } = filters;

        const employeeId = await this.resolveEmployeeId(userSession);

        const fileStatusFilter: ActiveFileStatus[] = (
            fileStatus ? [fileStatus] : ACTIVE_FILE_STATUSES
        ) as ActiveFileStatus[];

        const orderFilters: Record<string, any> = {};
        addIfDefined(orderFilters, 'folder', createRegexQuery(folder));
        addIfDefined(orderFilters, 'folder_path', createRegexQuery(folderPath));

        const progressFilters: Record<string, any> = {
            'progress.employee': employeeId,
        };

        const mappedJobType = mapJobTypeFilters(jobType);
        const { orderType, category, isQc } = mappedJobType;
        if (orderType) {
            const normalizedOrderType = String(orderType);
            orderFilters.type = createRegexQuery(normalizedOrderType, {
                exact: true,
            });
        }
        if (category) {
            progressFilters['progress.category'] = category;
        }
        if (isQc !== undefined) {
            progressFilters['progress.is_qc'] = isQc;
        }

        const skipCount = (page - 1) * itemsPerPage;

        const sharedMatchStages: mongoose.PipelineStage[] = [
            { $match: orderFilters },
            { $unwind: '$progress' },
            { $match: progressFilters },
            { $unwind: '$progress.files_tracking' },
            {
                $match: {
                    'progress.files_tracking.status': { $in: fileStatusFilter },
                },
            },
        ];

        const projectionStage: mongoose.PipelineStage = {
            $project: {
                _id: 0,
                order_id: '$_id',
                client_code: 1,
                client_name: 1,
                folder: 1,
                folder_path: 1,
                order_type: '$type',
                order_task: '$task',
                order_per_file_et: '$et',
                order_status: '$status',
                progress_category: '$progress.category',
                progress_is_qc: '$progress.is_qc',
                progress_qc_step: '$progress.qc_step',
                progress_shift: '$progress.shift',
                file_name: '$progress.files_tracking.file_name',
                file_status: '$progress.files_tracking.status',
                start_timestamp: '$progress.files_tracking.start_timestamp',
                end_timestamp: '$progress.files_tracking.end_timestamp',
                pause_start_timestamp:
                    '$progress.files_tracking.pause_start_timestamp',
                total_pause_duration:
                    '$progress.files_tracking.total_pause_duration',
                transferred_from: '$progress.files_tracking.transferred_from',
            },
        };

        const sortStage: mongoose.PipelineStage = {
            $sort: { start_timestamp: -1, order_id: 1 },
        };

        const basePipeline: mongoose.PipelineStage[] = [
            ...sharedMatchStages,
            projectionStage,
            sortStage,
        ];

        try {
            if (!paginated) {
                const jobs = await this.orderModel
                    .aggregate<SearchJobAggregateItem>(basePipeline)
                    .exec();

                return (jobs || []).map(job => ({
                    ...job,
                    job_type: deriveJobType(
                        String(job.order_type || ''),
                        String(job.progress_category || ''),
                    ),
                }));
            }

            const paginatedPipeline: mongoose.PipelineStage[] = [
                ...basePipeline,
                {
                    $facet: {
                        items: [{ $skip: skipCount }, { $limit: itemsPerPage }],
                        count: [{ $count: 'total' }],
                    },
                },
            ];

            const facetResult = await this.orderModel
                .aggregate<{
                    items: SearchJobAggregateItem[];
                    count: { total: number }[];
                }>(paginatedPipeline)
                .exec();

            const pagedItems = facetResult?.[0]?.items ?? [];
            const totalCount = facetResult?.[0]?.count?.[0]?.total ?? 0;

            const decoratedJobs: SearchJobResponseItem[] = pagedItems.map(
                job => ({
                    ...job,
                    job_type: deriveJobType(
                        String(job.order_type || ''),
                        String(job.progress_category || ''),
                    ),
                }),
            );

            return {
                pagination: {
                    count: totalCount,
                    pageCount: Math.ceil(totalCount / itemsPerPage) || 0,
                    page,
                    itemsPerPage,
                },
                items: decoratedJobs,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to retrieve jobs');
        }
    }
}
