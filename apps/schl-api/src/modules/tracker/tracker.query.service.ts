import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from '@repo/common/models/order.schema';
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

            const qcRows = await this.qcWorkLogModel
                .aggregate([
                    { $match: clientFilter },
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
            const userRegex = requestedUsername
                ? new RegExp(
                      `^${requestedUsername.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`,
                      'i',
                  )
                : null;

            const requestedDate =
                dto.date && dto.date.trim() ? dto.date.trim() : '';
            const today = new Date().toISOString().split('T')[0] as string;
            let usedDate = requestedDate || today;

            const loadBuckets = async (dateToUse: string) => {
                const qc = await this.qcWorkLogModel
                    .find(
                        userRegex
                            ? {
                                  employee_name: { $regex: userRegex },
                                  date_today: dateToUse,
                              }
                            : { date_today: dateToUse },
                    )
                    .select('client_code work_type files pause_time categories')
                    .lean()
                    .exec();

                return { prod: [], qc };
            };

            let { prod: prodBuckets, qc: qcBuckets } =
                await loadBuckets(usedDate);

            if (
                !requestedDate &&
                prodBuckets.length === 0 &&
                qcBuckets.length === 0
            ) {
                const lastQc = await this.qcWorkLogModel
                    .findOne(
                        userRegex
                            ? { employee_name: { $regex: userRegex } }
                            : {},
                    )
                    .sort({ date_today: -1, updatedAt: -1, createdAt: -1 })
                    .select('date_today')
                    .lean<{ date_today?: string }>()
                    .exec();

                const latest = [lastQc?.date_today]
                    .filter((date): date is string => Boolean(date))
                    .sort()
                    .pop();

                if (latest && latest !== usedDate) {
                    usedDate = latest;
                    const loaded = await loadBuckets(usedDate);
                    prodBuckets = loaded.prod;
                    qcBuckets = loaded.qc;
                }
            }

            type ClientAgg = {
                totalFiles: number;
                workSeconds: number;
                pauseSeconds: number;
                avgSeconds: number;
                lastWorkType?: string;
                lastCategory?: string;
            };

            const byClient: Record<string, ClientAgg> = {};

            const ensureClient = (client: string, workType: string) => {
                const safeClient = (client || 'unknown_client').toString();
                const safeWorkType = (
                    workType || 'unknown_work_type'
                ).toString();
                const key = `${safeClient}|||${safeWorkType}`;
                if (!byClient[key]) {
                    byClient[key] = {
                        totalFiles: 0,
                        workSeconds: 0,
                        pauseSeconds: 0,
                        avgSeconds: 0,
                        lastWorkType: '',
                        lastCategory: '',
                    };
                }
                return byClient[key];
            };

            type BucketFile = {
                file_status?: string;
                time_spent?: number;
            };

            type QcBucket = {
                client_code?: string;
                work_type?: string;
                categories?: string;
                files?: BucketFile[];
                pause_time?: number;
            };

            const safeQcBuckets = (qcBuckets || []) as QcBucket[];

            for (const b of safeQcBuckets) {
                const client: string = String(b.client_code ?? '');
                const workType = String(b.work_type ?? '');
                const agg = ensureClient(client, workType);
                const cat = String(b.categories ?? '').trim();

                const files = Array.isArray(b.files) ? b.files : [];

                const nonSkipFiles = files.filter(f => {
                    try {
                        const st = String(f?.file_status ?? '').trim();
                        return !/^skip$/i.test(st);
                    } catch {
                        return true;
                    }
                });

                agg.totalFiles += nonSkipFiles.length;
                for (const f of nonSkipFiles) {
                    agg.workSeconds += Number(f?.time_spent) || 0;
                }

                agg.pauseSeconds += Number(b.pause_time) || 0;
                if (workType) agg.lastWorkType = workType;
                if (cat) agg.lastCategory = cat;
            }

            let totalFiles = 0;
            let totalWorkSeconds = 0;
            let totalPauseSeconds = 0;

            for (const v of Object.values(byClient)) {
                totalFiles += v.totalFiles;
                totalWorkSeconds += v.workSeconds;
                totalPauseSeconds += v.pauseSeconds;
            }

            for (const v of Object.values(byClient)) {
                v.avgSeconds =
                    v.totalFiles > 0
                        ? Math.floor(v.workSeconds / v.totalFiles)
                        : 0;
            }

            const avgSeconds =
                totalFiles > 0 ? Math.floor(totalWorkSeconds / totalFiles) : 0;

            const workLogFilter = userRegex
                ? {
                      employee_name: { $regex: userRegex },
                      date_today: usedDate,
                  }
                : { date_today: usedDate };

            const workLogs = await this.qcWorkLogModel
                .find(workLogFilter)
                .lean()
                .exec();

            const sessionFilter: FilterQuery<UserSession> = {
                session_date: usedDate,
            };
            if (userRegex) {
                sessionFilter.username = { $regex: userRegex } as any;
            }

            const sessions = await this.userSessionModel
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
                ])
                .exec();

            return {
                success: true,
                data: {
                    usedDate,
                    totals: {
                        totalFiles,
                        totalWorkSeconds,
                        totalPauseSeconds,
                        avgSeconds,
                    },
                    byClient,
                },
                workLogs,
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
                filter.date_today = { $gte: requestedFrom, $lte: requestedTo } as any;
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

            const sessions = await this.qcWorkLogModel
                .find(filter)
                .lean()
                .exec();

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
                                    { $ifNull: ['$closed_duration_seconds', 0] },
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
                data: sessions,
                sessions: latestSessionsByUser,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to load live tracking data',
            );
        }
    }
}
