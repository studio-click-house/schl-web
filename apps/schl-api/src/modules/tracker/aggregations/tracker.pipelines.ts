import { FilterQuery, PipelineStage } from 'mongoose';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { UserSession } from '@repo/common/models/user-session.schema';

type LiveTrackingFilter = FilterQuery<WorkLog> & {
    updatedAt?: { $gte: Date };
};

export function buildLiveTrackingDataPipeline(filter: LiveTrackingFilter) {
    const normalizeExpr = (
        fieldExpr: any,
        fallback: string,
        options?: { lower?: boolean; preserveEmptyContext?: any },
    ) => {
        const lower = options?.lower ?? true;
        const preserveEmptyContext = options?.preserveEmptyContext ?? false;

        const rawText = {
            $toString: {
                $ifNull: [fieldExpr, ''],
            },
        };
        const trimmed = { $trim: { input: rawText } };
        const resolved = {
            $cond: [
                {
                    $and: [preserveEmptyContext, { $eq: [trimmed, ''] }],
                },
                '',
                {
                    $cond: [{ $eq: [trimmed, ''] }, fallback, trimmed],
                },
            ],
        };

        return lower ? { $toLower: resolved } : resolved;
    };

    const buildPauseKeyExpr = (sourceExpr: any) => {
        const preserveEmptyContext = {
            $eq: [sourceExpr, 'pause'],
        };

        const unassigned = 'unassigned';

        return {
            $concat: [
                normalizeExpr('$employee_name', 'unknown_employee', {
                    preserveEmptyContext,
                }),
                '|',
                normalizeExpr('$date_today', '', {
                    lower: false,
                    preserveEmptyContext,
                }),
                '|',
                normalizeExpr('$client_code', unassigned, {
                    preserveEmptyContext,
                }),
                '|',
                normalizeExpr('$folder_path', unassigned, {
                    lower: false,
                    preserveEmptyContext,
                }),
                '|',
                normalizeExpr('$shift', unassigned, {
                    preserveEmptyContext,
                }),
                '|',
                normalizeExpr('$work_type', unassigned, {
                    preserveEmptyContext,
                }),
            ],
        };
    };

    const pauseReasonsExpr = {
        $map: {
            input: { $ifNull: ['$pause_reasons', []] },
            as: 'item',
            in: {
                reason: {
                    $trim: {
                        input: {
                            $toString: {
                                $ifNull: ['$$item.reason', ''],
                            },
                        },
                    },
                },
                started_at: { $ifNull: ['$$item.started_at', null] },
                completed_at: { $ifNull: ['$$item.completed_at', null] },
                duration: {
                    $cond: [
                        { $ne: ['$$item.completed_at', null] },
                        {
                            $max: [
                                0,
                                {
                                    $toInt: {
                                        $ifNull: ['$$item.duration', 0],
                                    },
                                },
                            ],
                        },
                        {
                            $cond: [
                                { $ne: ['$$item.started_at', null] },
                                {
                                    $max: [
                                        0,
                                        {
                                            $toInt: {
                                                $floor: {
                                                    $divide: [
                                                        {
                                                            $subtract: [
                                                                '$$NOW',
                                                                '$$item.started_at',
                                                            ],
                                                        },
                                                        1000,
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                },
                                0,
                            ],
                        },
                    ],
                },
            },
        },
    };

    const pipeline: PipelineStage[] = [
        { $match: filter },
        {
            $project: {
                _id: 1,
                employee_name: 1,
                client_code: 1,
                folder_path: 1,
                shift: 1,
                work_type: 1,
                date_today: 1,
                estimate_time: 1,
                categories: 1,
                total_times: 1,
                files: 1,
                createdAt: 1,
                updatedAt: 1,
                source: { $literal: 'worklog' },
                pause_count: { $literal: 0 },
                pause_time: { $literal: 0 },
                pause_reasons: { $literal: [] },
            },
        },
        {
            $unionWith: {
                coll: 'pause_sessions',
                pipeline: [
                    { $match: filter as any },
                    {
                        $addFields: {
                            pause_reasons: pauseReasonsExpr,
                        },
                    },
                    {
                        $addFields: {
                            pause_count: {
                                $size: {
                                    $ifNull: ['$pause_reasons', []],
                                },
                            },
                            pause_time: {
                                $reduce: {
                                    input: { $ifNull: ['$pause_reasons', []] },
                                    initialValue: 0,
                                    in: {
                                        $add: [
                                            '$$value',
                                            {
                                                $max: [
                                                    0,
                                                    {
                                                        $toInt: {
                                                            $ifNull: [
                                                                '$$this.duration',
                                                                0,
                                                            ],
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            employee_name: 1,
                            client_code: 1,
                            folder_path: 1,
                            shift: 1,
                            work_type: 1,
                            date_today: 1,
                            estimate_time: { $literal: 0 },
                            categories: { $literal: '' },
                            total_times: {
                                $max: [
                                    0,
                                    {
                                        $toInt: {
                                            $ifNull: ['$total_times', 0],
                                        },
                                    },
                                ],
                            },
                            files: { $literal: [] },
                            createdAt: 1,
                            updatedAt: 1,
                            source: { $literal: 'pause' },
                            pause_count: 1,
                            pause_time: 1,
                            pause_reasons: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                key: buildPauseKeyExpr('$source'),
                source_priority: {
                    $cond: [{ $eq: ['$source', 'worklog'] }, 0, 1],
                },
            },
        },
        { $sort: { key: 1, source_priority: 1 } },
        {
            $group: {
                _id: '$key',
                base: { $first: '$$ROOT' },
                last: { $last: '$$ROOT' },
            },
        },
        {
            $replaceRoot: {
                newRoot: {
                    $let: {
                        vars: {
                            base: '$base',
                            last: '$last',
                        },
                        in: {
                            _id: '$$base._id',
                            employee_name: '$$base.employee_name',
                            client_code: '$$base.client_code',
                            folder_path: '$$base.folder_path',
                            shift: '$$base.shift',
                            work_type: '$$base.work_type',
                            date_today: '$$base.date_today',
                            estimate_time: '$$base.estimate_time',
                            categories: '$$base.categories',
                            files: '$$base.files',
                            createdAt: '$$base.createdAt',
                            updatedAt: '$$base.updatedAt',
                            pause_count: {
                                $cond: [
                                    { $eq: ['$$last.source', 'pause'] },
                                    '$$last.pause_count',
                                    0,
                                ],
                            },
                            pause_time: {
                                $cond: [
                                    { $eq: ['$$last.source', 'pause'] },
                                    '$$last.pause_time',
                                    0,
                                ],
                            },
                            pause_reasons: {
                                $cond: [
                                    { $eq: ['$$last.source', 'pause'] },
                                    '$$last.pause_reasons',
                                    [],
                                ],
                            },
                            total_times: {
                                $cond: [
                                    {
                                        $and: [
                                            {
                                                $lte: [
                                                    {
                                                        $ifNull: [
                                                            '$$base.total_times',
                                                            0,
                                                        ],
                                                    },
                                                    0,
                                                ],
                                            },
                                            {
                                                $eq: ['$$last.source', 'pause'],
                                            },
                                            {
                                                $gt: [
                                                    {
                                                        $ifNull: [
                                                            '$$last.total_times',
                                                            0,
                                                        ],
                                                    },
                                                    0,
                                                ],
                                            },
                                        ],
                                    },
                                    '$$last.total_times',
                                    {
                                        $max: [
                                            0,
                                            {
                                                $toInt: {
                                                    $ifNull: [
                                                        '$$base.total_times',
                                                        0,
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        },
        { $sort: { updatedAt: -1 } },
    ] as any;

    return pipeline;
}

export function buildTrackerUserSessionsPipeline(
    match: FilterQuery<UserSession>,
): PipelineStage[] {
    return [
        { $match: match },
        {
            $group: {
                _id: '$username',
                username: { $first: '$username' },
                user_type: { $first: '$user_type' },
                session_date: { $first: '$session_date' },
                first_login_at: { $min: '$login_at' },
                last_login_at: { $max: '$login_at' },
                last_logout_at: { $max: '$logout_at' },
                closed_duration_seconds: {
                    $sum: { $ifNull: ['$duration_session', 0] },
                },
                active_login_at: {
                    $max: {
                        $cond: [
                            { $eq: ['$logout_at', null] },
                            '$login_at',
                            null,
                        ],
                    },
                },
                is_active: {
                    $max: {
                        $cond: [{ $eq: ['$logout_at', null] }, 1, 0],
                    },
                },
            },
        },
        {
            $addFields: {
                is_active: { $eq: ['$is_active', 1] },
                active_elapsed_seconds: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ['$is_active', 1] },
                                { $ne: ['$active_login_at', null] },
                            ],
                        },
                        {
                            $max: [
                                0,
                                {
                                    $divide: [
                                        {
                                            $subtract: [
                                                '$$NOW',
                                                '$active_login_at',
                                            ],
                                        },
                                        1000,
                                    ],
                                },
                            ],
                        },
                        0,
                    ],
                },
            },
        },
        {
            $addFields: {
                total_duration_seconds: {
                    $add: [
                        { $ifNull: ['$closed_duration_seconds', 0] },
                        { $ifNull: ['$active_elapsed_seconds', 0] },
                    ],
                },
            },
        },
        {
            $sort: {
                is_active: -1,
                last_login_at: -1,
                last_logout_at: -1,
            },
        },
    ];
}
