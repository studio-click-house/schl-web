import { FilterQuery, PipelineStage } from 'mongoose';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { UserSession } from '@repo/common/models/user-session.schema';

type LiveTrackingFilter = FilterQuery<WorkLog> & {
    updatedAt?: { $gte: Date };
};

export function buildLiveTrackingDataPipeline(filter: LiveTrackingFilter) {
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
            },
        },
        {
            $lookup: {
                from: 'pause_sessions',
                let: {
                    workLogId: '$_id',
                    employeeName: '$employee_name',
                    clientCode: '$client_code',
                    folderPath: '$folder_path',
                    shift: '$shift',
                    workType: '$work_type',
                    dateToday: '$date_today',
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ['$work_log_id', '$$workLogId'] },
                                    {
                                        $and: [
                                            {
                                                $eq: [
                                                    {
                                                        $ifNull: [
                                                            '$work_log_id',
                                                            null,
                                                        ],
                                                    },
                                                    null,
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    '$employee_name',
                                                    '$$employeeName',
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    '$client_code',
                                                    '$$clientCode',
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    '$folder_path',
                                                    '$$folderPath',
                                                ],
                                            },
                                            {
                                                $eq: ['$shift', '$$shift'],
                                            },
                                            {
                                                $eq: [
                                                    '$work_type',
                                                    '$$workType',
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    '$date_today',
                                                    '$$dateToday',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
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
                        },
                    },
                    { $sort: { updatedAt: -1 } },
                    { $limit: 1 },
                    {
                        $project: {
                            _id: 0,
                            pause_count: 1,
                            pause_time: 1,
                            pause_reasons: 1,
                            total_times: 1,
                        },
                    },
                ],
                as: 'pause',
            },
        },
        {
            $addFields: {
                pause: { $arrayElemAt: ['$pause', 0] },
            },
        },
        {
            $addFields: {
                pause_count: {
                    $ifNull: ['$pause.pause_count', 0],
                },
                pause_time: {
                    $ifNull: ['$pause.pause_time', 0],
                },
                pause_reasons: {
                    $ifNull: ['$pause.pause_reasons', []],
                },
                total_times: {
                    $cond: [
                        {
                            $and: [
                                {
                                    $lte: [{ $ifNull: ['$total_times', 0] }, 0],
                                },
                                {
                                    $gt: [
                                        {
                                            $ifNull: ['$pause.total_times', 0],
                                        },
                                        0,
                                    ],
                                },
                            ],
                        },
                        { $ifNull: ['$pause.total_times', 0] },
                        {
                            $max: [
                                0,
                                {
                                    $toInt: {
                                        $ifNull: ['$total_times', 0],
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            $project: {
                pause: 0,
            },
        },
        {
            $unionWith: {
                coll: 'pause_sessions',
                pipeline: [
                    { $match: filter as any },
                    {
                        $match: {
                            $or: [
                                { work_log_id: { $exists: false } },
                                { work_log_id: null },
                            ],
                        },
                    },
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
                            total_times: 1,
                            files: { $literal: [] },
                            createdAt: 1,
                            updatedAt: 1,
                            pause_count: 1,
                            pause_time: 1,
                            pause_reasons: 1,
                        },
                    },
                ],
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
