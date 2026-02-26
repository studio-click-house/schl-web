import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from '@repo/common/models/order.schema';
import { QcWorkLog } from '@repo/common/models/qc-work-log.schema';
import { Model } from 'mongoose';
import { DashboardTodayDto } from './dto/dashboard-today.dto';
import { JobListDto } from './dto/job-list.dto';
import { SearchFileDto } from './dto/search-file.dto';

@Injectable()
export class TrackerQueryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,
        @InjectModel(QcWorkLog.name)
        private readonly qcWorkLogModel: Model<QcWorkLog>,
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
                    'client_code folder folder_path task et quantity status',
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
        if (!dto?.username || !dto.username.trim()) {
            throw new BadRequestException('Missing username');
        }

        try {
            const username = dto.username.trim();
            const userRegex = new RegExp(
                `^${username.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`,
                'i',
            );

            const requestedDate =
                dto.date && dto.date.trim() ? dto.date.trim() : '';
            const today = new Date().toISOString().split('T')[0] as string;
            let usedDate = requestedDate || today;

            const loadBuckets = async (dateToUse: string) => {
                const qc = await this.qcWorkLogModel
                    .find({
                        employee_name: { $regex: userRegex },
                        date_today: dateToUse,
                    })
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
                const [lastProd, lastQc] = await Promise.all([
                    null,
                    this.qcWorkLogModel
                        .findOne({ employee_name: { $regex: userRegex } })
                        .sort({ date_today: -1, updatedAt: -1, createdAt: -1 })
                        .select('date_today')
                        .lean()
                        .exec(),
                ]);

                const prodDate = undefined as string | undefined;
                const qcDate = (lastQc as any)?.date_today as
                    | string
                    | undefined;
                const latest = [prodDate, qcDate].filter(Boolean).sort().pop();

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

            for (const b of qcBuckets || []) {
                const client: string = String((b as any).client_code ?? '');
                const workType = ((b as any).work_type || '').toString();
                const agg = ensureClient(client, workType);
                const cat = ((b as any).categories || '').toString().trim();

                const files = Array.isArray((b as any).files)
                    ? (b as any).files
                    : [];

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

                agg.pauseSeconds += Number((b as any).pause_time) || 0;
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
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to load dashboard');
        }
    }
}
