import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from '@repo/common/models/order.schema';
import { WorkLog } from '@repo/common/models/work-log.schema';
import { UserSession } from '@repo/common/models/user-session.schema';
import { FilterQuery, Model } from 'mongoose';
import { DashboardTodayDto } from '../dto/dashboard-today.dto';
import { JobListDto } from '../dto/job-list.dto';
import { SearchFileDto } from '../dto/search-file.dto';
import { LiveTrackingDataDto } from '../dto/live-tracking-data.dto';
import moment from 'moment-timezone';
import {
    buildLiveTrackingDataPipeline,
    buildTrackerUserSessionsPipeline,
} from '../aggregations/tracker.pipelines';

@Injectable()
export class TrackerQueryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
        @InjectModel(WorkLog.name)
        private readonly workLogModel: Model<WorkLog>,
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

            const workLogRows = await this.workLogModel
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

            const all = [...(workLogRows || [])]
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
            const today = moment().tz('Asia/Dhaka').format('YYYY-MM-DD');
            const usedDate = requestedDate || today;

            // Single query: fetch work logs for the date + user
            const workLogFilter = userRegex
                ? {
                      employee_name: { $regex: userRegex },
                      date_today: usedDate,
                  }
                : { date_today: usedDate };

            const pipelineFilter = workLogFilter as FilterQuery<WorkLog> & {
                updatedAt?: { $gte: Date };
            };

            const [workLogs, sessions] = await Promise.all([
                this.workLogModel
                    .aggregate(buildLiveTrackingDataPipeline(pipelineFilter))
                    .exec(),

                this.userSessionModel
                    .aggregate(
                        buildTrackerUserSessionsPipeline({
                            session_date: usedDate,
                            ...(userRegex
                                ? { username: { $regex: userRegex } }
                                : {}),
                        }),
                    )
                    .exec(),
            ]);

            return {
                success: true,
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
            const today = moment().tz('Asia/Dhaka').format('YYYY-MM-DD');
            const usedDate = requestedDate || today;

            // Default behavior: return today's sessions.
            // If UI wants older data, it must pass an explicit dateToday.
            const filter: FilterQuery<WorkLog> & {
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
                .aggregate(buildTrackerUserSessionsPipeline(sessionFilter))
                .exec();

            const data = await this.workLogModel
                .aggregate(buildLiveTrackingDataPipeline(filter))
                .exec();

            return {
                success: true,
                data,
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
