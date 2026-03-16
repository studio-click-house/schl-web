import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from '@repo/common/models/order.schema';
import { PauseSession } from '@repo/common/models/pause-session.schema';
import { QcWorkLog } from '@repo/common/models/qc-work-log.schema';
import { UserSession } from '@repo/common/models/user-session.schema';
import { FilterQuery, Model } from 'mongoose';
import { DashboardTodayDto } from './dto/dashboard-today.dto';
import { JobListDto } from './dto/job-list.dto';
import { SearchFileDto } from './dto/search-file.dto';
import { LiveTrackingDataDto } from './dto/live-tracking-data.dto';

@Injectable()
export class TrackerQueryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
        @InjectModel(PauseSession.name)
        private readonly pauseSessionModel: Model<PauseSession>,
        @InjectModel(QcWorkLog.name)
        private readonly qcWorkLogModel: Model<QcWorkLog>,
        @InjectModel(UserSession.name)
        private readonly userSessionModel: Model<UserSession>,
    ) {}

    async jobList(dto: JobListDto) {
        try {
            const baseFilter: Record<string, any> = {
                status: { $in: [/^running$/i, /^correction$/i] },
            };

            const orders = await this.orderModel
                .find(
                    dto.clientCode
                        ? {
                              ...baseFilter,
                              client_code: {
                                  $regex: new RegExp(
                                      `^${dto.clientCode.trim().replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`,
                                      'i',
                                  ),
                              },
                          }
                        : baseFilter,
                )
                .sort({ updatedAt: -1, createdAt: -1 })
                .select(
                    'client_code folder folder_path task et quantity status type',
                )
                .lean()
                .exec();

            const jobs = (orders || []).map(o => {
                const clientCode = (o.client_code || '').trim();
                const folder = (o.folder || '').trim();
                const folderPath = (o.folder_path || '').trim();

                return {
                    clientCode,
                    folder,
                    folderPath,
                    task: (o.task || '').trim(),
                    et: Number(o.et) || 0,
                    nof: Number(o.quantity) || 0,
                    status: (o.status || '').trim(),
                    type: (o.type || '').trim(),
                };
            });

            return {
                success: true,
                jobs,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to load job list');
        }
    }

    async searchFile(dto: SearchFileDto) {
        if (!dto || !dto.query || !dto.query.trim()) {
            throw new BadRequestException('Missing search query');
        }

        try {
            const escapeRegExp = (value: string) =>
                value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

            const q = dto.query.trim();
            const fileRegex = new RegExp(escapeRegExp(q), 'i');

            const clientCode = (dto.clientCode || '').trim();
            const clientFilter = clientCode
                ? {
                      client_code: {
                          $regex: new RegExp(
                              `^${escapeRegExp(clientCode)}$`,
                              'i',
                          ),
                      },
                  }
                : {};

            const limit = 50;

            // Lookback window: default 7 days
            const lookbackDays = Math.max(1, Math.floor(Number(dto.days) || 7));
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - lookbackDays);
            const cutoffDate = cutoff.toISOString().split('T')[0] as string;

            const qcRows = await this.qcWorkLogModel
                .aggregate([
                    {
                        $match: {
                            ...clientFilter,
                            date_today: { $gte: cutoffDate },
                        },
                    },
                    { $unwind: '$files' },
                    {
                        $match: {
                            'files.file_name': { $regex: fileRegex },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            fileName: '$files.file_name',
                            employeeName: '$employee_name',
                            workType: '$work_type',
                            shift: '$shift',
                            clientName: '$client_code',
                            clientCode: '$client_code',
                            timeSpentSeconds: '$files.time_spent',
                            folderPath: '$folder_path',
                            dateToday: '$date_today',
                            report: '$files.report',
                            fileStatus: '$files.file_status',
                            startedAt: '$files.started_at',
                            completedAt: '$files.completed_at',
                            updatedAt: '$updatedAt',
                        },
                    },
                    { $sort: { updatedAt: -1 } },
                    { $limit: limit },
                ])
                .exec();

            const asString = (val: unknown): string => {
                if (val === null || val === undefined) return '';
                if (typeof val === 'string') return val;
                if (typeof val === 'number' || typeof val === 'boolean') {
                    return String(val);
                }
                if (val instanceof Date) return val.toISOString();
                return '';
            };

            const toTimeMs = (val: unknown): number => {
                try {
                    if (!val) return 0;
                    if (val instanceof Date) return val.getTime();
                    if (typeof val === 'string' || typeof val === 'number') {
                        const t = new Date(val).getTime();
                        return Number.isFinite(t) ? t : 0;
                    }
                    return 0;
                } catch {
                    return 0;
                }
            };

            const toHmsSafe = (secondsRaw: unknown): string => {
                try {
                    const total = Math.max(
                        0,
                        Math.floor(Number(secondsRaw) || 0),
                    );
                    const h = Math.floor(total / 3600);
                    const m = Math.floor((total % 3600) / 60);
                    const s = total % 60;
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `${pad(h)}:${pad(m)}:${pad(s)}`;
                } catch {
                    return '00:00:00';
                }
            };

            const normalizePath = (
                folderPath: unknown,
                fileName: unknown,
            ): string => {
                try {
                    const dir = asString(folderPath).trim();
                    const f = asString(fileName).trim();
                    if (!dir) return f;
                    if (!f) return dir;
                    return (
                        dir.replace(/[\\/]+$/, '') +
                        '\\' +
                        f.replace(/^[\\/]+/, '')
                    );
                } catch {
                    return asString(fileName);
                }
            };

            const all = [...(qcRows || [])]
                .sort((a, b) => toTimeMs(b?.updatedAt) - toTimeMs(a?.updatedAt))
                .slice(0, limit)
                .map(r => ({
                    fileName: asString(r?.fileName),
                    employeeName: asString(r?.employeeName),
                    workType: asString(r?.workType),
                    shift: asString(r?.shift),
                    clientName: asString(r?.clientName),
                    clientCode: asString(r?.clientCode),
                    timeSpent: toHmsSafe(r?.timeSpentSeconds),
                    filePath: normalizePath(r.folderPath, r.fileName),
                    folderPath: asString(r?.folderPath),
                    dateToday: asString(r?.dateToday),
                    report: asString(r?.report),
                    fileStatus: asString(r?.fileStatus),
                    startedAt:
                        r?.startedAt instanceof Date
                            ? r.startedAt.toISOString()
                            : asString(r?.startedAt),
                    completedAt:
                        r?.completedAt instanceof Date
                            ? r.completedAt.toISOString()
                            : asString(r?.completedAt),
                }));

            return {
                success: true,
                results: all,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to search files');
        }
    }

    async dashboardToday(dto: DashboardTodayDto) {
        try {
            const requestedUsername =
                dto?.username && dto.username.trim() ? dto.username.trim() : '';

            const escapeRegex = (value: string) =>
                value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const normalizeUserKey = (value: string) => {
                const trimmed = (value || '').trim();
                if (!trimmed) return '';
                const parts = trimmed.split('-');
                const left = (parts[0] || '').trim();
                return left || trimmed;
            };

            const requestedUserKey = normalizeUserKey(requestedUsername);

            const userRegex = requestedUserKey
                ? new RegExp(
                      `^${escapeRegex(requestedUserKey)}(\\s*-.*)?$`,
                      'i',
                  )
                : null;

            const requestedDate =
                dto.date && dto.date.trim() ? dto.date.trim() : '';
            const today = new Date().toISOString().split('T')[0] as string;
            const usedDate = requestedDate || today;

            // Single query: fetch work logs for the date + user
            const workLogFilter = userRegex
                ? {
                      employee_name: { $regex: userRegex },
                      date_today: usedDate,
                  }
                : { date_today: usedDate };

            const [workLogs, pauseSessions, sessions] = await Promise.all([
                this.qcWorkLogModel.find(workLogFilter).lean().exec(),

                this.pauseSessionModel
                    .find(workLogFilter as FilterQuery<PauseSession>)
                    .lean()
                    .exec(),

                this.userSessionModel
                    .aggregate([
                        {
                            $match: {
                                session_date: usedDate,
                                ...(userRegex
                                    ? { username: { $regex: userRegex } as any }
                                    : {}),
                            },
                        },
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
                                    $sum: {
                                        $ifNull: ['$duration_session', 0],
                                    },
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
                                        $cond: [
                                            { $eq: ['$logout_at', null] },
                                            1,
                                            0,
                                        ],
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
                                                {
                                                    $ne: [
                                                        '$active_login_at',
                                                        null,
                                                    ],
                                                },
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
                                        {
                                            $ifNull: [
                                                '$closed_duration_seconds',
                                                0,
                                            ],
                                        },
                                        {
                                            $ifNull: [
                                                '$active_elapsed_seconds',
                                                0,
                                            ],
                                        },
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
                    ])
                    .exec(),
            ]);

            return {
                success: true,
                workLogs: this.mergePauseSessions(workLogs, pauseSessions),
                sessions,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to load dashboard');
        }
    }

    async liveTrackingData(dto: LiveTrackingDataDto) {
        try {
            const requestedDate =
                dto.dateToday && dto.dateToday.trim()
                    ? dto.dateToday.trim()
                    : '';
            const requestedFrom =
                dto.dateFrom && dto.dateFrom.trim() ? dto.dateFrom.trim() : '';
            const requestedTo =
                dto.dateTo && dto.dateTo.trim() ? dto.dateTo.trim() : '';
            const today = new Date().toISOString().split('T')[0] as string;
            const usedDate = requestedDate || today;

            // Default behavior: return today's sessions.
            // If UI wants older data, it must pass an explicit dateToday.
            const filter: FilterQuery<QcWorkLog> & {
                updatedAt?: { $gte: Date };
            } = { date_today: usedDate };

            // Range behavior: when dateFrom/dateTo provided, fetch full range (no hours cutoff)
            if (requestedFrom && requestedTo) {
                filter.date_today = {
                    $gte: requestedFrom,
                    $lte: requestedTo,
                } as any;
                delete filter.updatedAt;
            } else {
                const hasHoursWindow =
                    typeof dto.hours === 'number' &&
                    Number.isFinite(dto.hours) &&
                    dto.hours > 0;
                if (usedDate === today && hasHoursWindow) {
                    const cutoff = new Date(
                        Date.now() - (dto.hours as number) * 60 * 60 * 1000,
                    );
                    filter.updatedAt = { $gte: cutoff };
                }
            }

            const [sessions, pauseSessions] = await Promise.all([
                this.qcWorkLogModel.find(filter).lean().exec(),
                this.pauseSessionModel
                    .find(filter as FilterQuery<PauseSession>)
                    .lean()
                    .exec(),
            ]);

            const sessionFilter: FilterQuery<UserSession> = {};
            if (requestedFrom && requestedTo) {
                sessionFilter.session_date = {
                    $gte: requestedFrom,
                    $lte: requestedTo,
                } as any;
            } else {
                sessionFilter.session_date = usedDate;
            }

            const latestSessionsByUser = await this.userSessionModel
                .aggregate([
                    { $match: sessionFilter },
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

                            // If any session has no logout, consider user active.
                            is_active: {
                                $max: {
                                    $cond: [
                                        { $eq: ['$logout_at', null] },
                                        1,
                                        0,
                                    ],
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
                                    {
                                        $ifNull: [
                                            '$closed_duration_seconds',
                                            0,
                                        ],
                                    },
                                    { $ifNull: ['$active_elapsed_seconds', 0] },
                                ],
                            },
                        },
                    },
                    // Sort by newest (active users first, then most recent activity)
                    {
                        $sort: {
                            is_active: -1,
                            last_login_at: -1,
                            last_logout_at: -1,
                        },
                    },
                ])
                .exec();

            return {
                success: true,
                data: this.mergePauseSessions(sessions, pauseSessions),
                sessions: latestSessionsByUser,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to load live tracking data',
            );
        }
    }

    private mergePauseSessions(
        workLogs: Record<string, any>[],
        pauseSessions: Record<string, any>[],
    ): Array<Record<string, any>> {
        const merged = new Map<string, Record<string, any>>();

        for (const raw of workLogs ?? []) {
            const workLog = {
                ...raw,
                pause_count: 0,
                pause_time: 0,
                pause_reasons: [],
            };
            merged.set(this.buildPauseKey(workLog), workLog);
        }

        for (const pause of pauseSessions ?? []) {
            const key = this.buildPauseKey(pause, true);
            const pauseCount = Array.isArray(pause?.pause_reasons)
                ? pause.pause_reasons.length
                : 0;
            const pauseReasons = this.decoratePauseReasons(pause);
            const pauseTime = pauseReasons.reduce(
                (sum, item) => sum + Math.max(0, Number(item?.duration) || 0),
                0,
            );

            const existing = merged.get(key);
            if (existing) {
                existing.pause_count = pauseCount;
                existing.pause_time = pauseTime;
                existing.pause_reasons = pauseReasons;
                if (
                    (existing.total_times ?? 0) <= 0 &&
                    (pause?.total_times ?? 0) > 0
                ) {
                    existing.total_times = pause.total_times;
                }
                continue;
            }

            merged.set(key, {
                _id: pause?._id,
                employee_name: pause?.employee_name ?? '',
                client_code: pause?.client_code ?? '',
                folder_path: pause?.folder_path ?? '',
                shift: pause?.shift ?? '',
                work_type: pause?.work_type ?? '',
                date_today: pause?.date_today ?? '',
                estimate_time: 0,
                categories: '',
                total_times: Math.max(0, Number(pause?.total_times) || 0),
                pause_count: pauseCount,
                pause_time: pauseTime,
                pause_reasons: pauseReasons,
                files: [],
                createdAt: pause?.createdAt,
                updatedAt: pause?.updatedAt,
            });
        }

        return Array.from(merged.values()).sort((left, right) => {
            const leftTime = new Date(
                (left?.updatedAt as string | number | Date) ?? 0,
            ).getTime();
            const rightTime = new Date(
                (right?.updatedAt as string | number | Date) ?? 0,
            ).getTime();
            return rightTime - leftTime;
        });
    }

    private buildPauseKey(doc: any, preserveEmptyContext = false) {
        const normalize = (value: unknown, fallback = '', lower = true) => {
            const text =
                value === null || value === undefined
                    ? ''
                    : typeof value === 'string'
                      ? value
                      : typeof value === 'number' || typeof value === 'boolean'
                        ? String(value)
                        : '';
            const trimmed = text.trim();
            const resolved =
                preserveEmptyContext && trimmed.length === 0
                    ? ''
                    : trimmed || fallback;
            return lower ? resolved.toLowerCase() : resolved;
        };

        return [
            normalize(doc?.employee_name, 'unknown_employee'),
            normalize(doc?.date_today, '', false),
            normalize(doc?.client_code, 'unknown_client'),
            normalize(doc?.folder_path, 'unknown_folder', false),
            normalize(doc?.shift, 'unknown_shift'),
            normalize(doc?.work_type, 'qc'),
        ].join('|');
    }

    private decoratePauseReasons(doc: Record<string, any>): Array<{
        reason: string;
        duration: number;
        started_at: Date | null;
        completed_at: Date | null;
    }> {
        const now = Date.now();
        const reasons = Array.isArray(doc?.pause_reasons)
            ? doc.pause_reasons
            : [];
        return reasons.map((item: any) => {
            const startedAt = item?.started_at
                ? new Date(item.started_at as string | number | Date)
                : null;
            const completedAt = item?.completed_at
                ? new Date(item.completed_at as string | number | Date)
                : null;
            const duration = completedAt
                ? Math.max(0, Number(item?.duration) || 0)
                : startedAt
                  ? Math.max(0, Math.floor((now - startedAt.getTime()) / 1000))
                  : 0;

            return {
                reason: String(item?.reason ?? '').trim(),
                duration,
                started_at: startedAt,
                completed_at: completedAt,
            };
        });
    }
}
