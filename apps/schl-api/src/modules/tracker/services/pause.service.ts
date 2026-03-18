import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PauseSession } from '@repo/common/models/pause-session.schema';
import { Model } from 'mongoose';
import { PauseDto } from '../dto/pause.dto';
import { TrackerGateway } from '../gateways/tracker.gateway';
import { TrackerFactory } from '../factories/tracker.factory';
import moment from 'moment-timezone';

@Injectable()
export class TrackerPauseService {
    constructor(
        @InjectModel(PauseSession.name)
        private readonly pauseSessionModel: Model<PauseSession>,
        private readonly trackerGateway: TrackerGateway,
    ) {}

    async syncPause(payload: PauseDto) {
        if (!payload.employeeName) {
            throw new BadRequestException('Missing employee name');
        }

        const status = this.normalizeStatus(payload.status);
        if (!status) {
            throw new BadRequestException('Invalid pause status');
        }

        if (status === 'paused') {
            const reason =
                typeof payload.reason === 'string' ? payload.reason.trim() : '';
            if (!reason) {
                throw new BadRequestException('Missing pause reason');
            }
        }

        try {
            const now = new Date();
            const dateString = moment().tz('Asia/Dhaka').format('YYYY-MM-DD');
            const filter = this.buildFilter(payload, dateString);
            const syncId =
                typeof payload.syncId === 'string' ? payload.syncId.trim() : '';

            if (syncId) {
                const existing = await this.pauseSessionModel
                    .findOne(
                        { ...filter, processed_sync_ids: syncId },
                        { _id: 1 },
                    )
                    .lean();
                if (existing) {
                    return { success: true, deduped: true };
                }
            }

            const setUpdate: Record<string, any> = {};
            if (payload.totalTimes !== undefined) {
                setUpdate.total_times = Math.max(
                    0,
                    Number(payload.totalTimes) || 0,
                );
            }

            const baseUpdate: Record<string, any> = {
                $setOnInsert: filter,
            };
            if (Object.keys(setUpdate).length > 0) {
                baseUpdate.$set = setUpdate;
            }
            if (syncId) {
                baseUpdate.$push = {
                    processed_sync_ids: { $each: [syncId], $slice: -10 },
                };
            }

            await this.pauseSessionModel.updateOne(filter, baseUpdate, {
                upsert: true,
            });

            if (status === 'paused') {
                await this.startPause(filter, payload, now);
            } else {
                await this.endPause(filter, now);
            }

            await this.refreshPauseAggregates(filter);

            const updated = await this.pauseSessionModel.findOne(filter).lean();
            if (updated) {
                const employeeName = TrackerFactory.normalizeEmployeeName(
                    payload.employeeName,
                );
                this.trackerGateway.broadcastTrackerUpdate('TRACKER_UPDATED', {
                    _id: (updated as any)._id,
                    employeeName,
                    clientCode: payload.clientCode,
                    workType: payload.workType,
                    shift: payload.shift,
                    folderPath: payload.folderPath,
                    fileStatus: status,
                    timestamp: now.toISOString(),
                    total_times: Math.max(
                        0,
                        Number((updated as any)?.total_times) || 0,
                    ),
                    pause_time: this.getEffectivePauseTime(updated),
                    pause_count: Array.isArray((updated as any)?.pause_reasons)
                        ? (updated as any).pause_reasons.length
                        : 0,
                    pause_reasons: this.decoratePauseReasons(updated),
                    files: [],
                });
            }

            return { success: true };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to sync pause');
        }
    }

    private normalizeStatus(status?: string): 'paused' | 'working' | null {
        const normalized = String(status || '')
            .trim()
            .toLowerCase();
        if (normalized === 'pause' || normalized === 'paused') {
            return 'paused';
        }
        if (
            normalized === 'resume' ||
            normalized === 'resumed' ||
            normalized === 'working' ||
            normalized === 'in_progress' ||
            normalized === 'in progress' ||
            normalized === 'in-progress'
        ) {
            return 'working';
        }

        return null;
    }

    private buildFilter(payload: PauseDto, dateString: string) {
        const hasJobContext = [payload.clientCode, payload.folderPath]
            .map(value => String(value || '').trim())
            .some(value => value.length > 0);

        const unassigned = 'unassigned';

        return {
            employee_name: TrackerFactory.normalizeEmployeeName(
                payload.employeeName || 'unknown_employee',
            ),
            date_today: dateString,
            client_code: (
                payload.clientCode ||
                (hasJobContext ? 'unknown_client' : unassigned)
            )
                .trim()
                .toLowerCase(),
            folder_path: (
                payload.folderPath ||
                (hasJobContext ? 'unknown_folder' : unassigned)
            ).trim(),
            shift: (
                payload.shift || (hasJobContext ? 'unknown_shift' : unassigned)
            )
                .trim()
                .toLowerCase(),
            work_type: (payload.workType || (hasJobContext ? 'qc' : unassigned))
                .trim()
                .toLowerCase(),
        };
    }

    private async startPause(
        filter: Record<string, any>,
        payload: PauseDto,
        now: Date,
    ) {
        const existing = await this.pauseSessionModel
            .findOne(filter, { pause_reasons: 1 })
            .lean();

        const reasons = Array.isArray((existing as any)?.pause_reasons)
            ? ((existing as any).pause_reasons as any[])
            : [];
        const hasOpenPause = reasons.some(pr => pr?.completed_at == null);
        const reason = String(payload.reason || '').trim();

        if (hasOpenPause) {
            if (!reason) {
                return;
            }

            await this.pauseSessionModel.updateOne(
                {
                    ...filter,
                    pause_reasons: { $elemMatch: { completed_at: null } },
                },
                {
                    $set: {
                        'pause_reasons.$[open].reason': reason,
                    },
                },
                {
                    arrayFilters: [{ 'open.completed_at': null }],
                },
            );
            return;
        }

        await this.pauseSessionModel.updateOne(filter, {
            $push: {
                pause_reasons: {
                    $each: [
                        {
                            reason,
                            duration: 0,
                            started_at: now,
                            completed_at: null,
                        },
                    ],
                    $slice: -5,
                },
            },
        });
    }

    private async endPause(filter: Record<string, any>, now: Date) {
        const existing = await this.pauseSessionModel
            .findOne(filter, { pause_reasons: 1 })
            .lean();

        const reasons = Array.isArray((existing as any)?.pause_reasons)
            ? ((existing as any).pause_reasons as any[])
            : [];
        const open = [...reasons]
            .reverse()
            .find(pr => pr?.completed_at == null);
        if (!open) {
            return;
        }

        const startedAt = open.started_at
            ? new Date(open.started_at as string | number | Date)
            : now;
        const duration = Math.max(
            0,
            Math.floor((now.getTime() - startedAt.getTime()) / 1000),
        );

        await this.pauseSessionModel.updateOne(
            {
                ...filter,
                pause_reasons: { $elemMatch: { completed_at: null } },
            },
            {
                $set: {
                    'pause_reasons.$[open].completed_at': now,
                    'pause_reasons.$[open].duration': duration,
                },
            },
            {
                arrayFilters: [{ 'open.completed_at': null }],
            },
        );
    }

    private async refreshPauseAggregates(filter: Record<string, any>) {
        const existing = await this.pauseSessionModel
            .findOne(filter, { pause_reasons: 1 })
            .lean();

        const reasons = Array.isArray((existing as any)?.pause_reasons)
            ? ((existing as any).pause_reasons as Array<{
                  duration?: number;
                  completed_at?: Date | null;
              }>)
            : [];

        const pauseCount = reasons.length;
        const pauseTime = reasons.reduce((sum, item) => {
            if (!item?.completed_at) {
                return sum;
            }

            return sum + Math.max(0, Number(item.duration) || 0);
        }, 0);

        await this.pauseSessionModel.updateOne(
            filter,
            {
                $set: {
                    pause_count: pauseCount,
                    pause_time: pauseTime,
                },
            },
            { upsert: true },
        );
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
            const liveDuration =
                !completedAt && startedAt
                    ? Math.max(
                          0,
                          Math.floor((now - startedAt.getTime()) / 1000),
                      )
                    : 0;

            return {
                reason: String(item?.reason || '').trim(),
                duration: completedAt
                    ? Math.max(0, Number(item?.duration) || 0)
                    : liveDuration,
                started_at: startedAt,
                completed_at: completedAt,
            };
        });
    }

    private getEffectivePauseTime(doc: Record<string, any>): number {
        return this.decoratePauseReasons(doc).reduce(
            (sum: number, item: { duration?: number }) =>
                sum + Math.max(0, Number(item?.duration) || 0),
            0,
        );
    }
}
