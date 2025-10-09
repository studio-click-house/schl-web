import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import moment from 'moment-timezone';
import { Model } from 'mongoose';
import { UserSession } from 'src/common/types/user-session.type';
import { hasPerm } from 'src/common/utils/permission-check';
import { Report } from 'src/models/report.schema';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    ) {}

    async getCallReportsTrend(userSession: UserSession) {
        try {
            if (!hasPerm('crm:view_crm_stats', userSession.permissions)) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startDate = now
                .clone()
                .subtract(12, 'months')
                .startOf('month')
                .toDate();
            const endDate = now.clone().endOf('month').toDate();

            // Aggregate counts per month for last 12 months (including current)
            interface AggRow {
                _id: { month: number; year: number };
                count: number;
            }

            const reports = (await this.reportModel
                .aggregate([
                    {
                        $match: {
                            is_lead: false,
                            createdAt: { $gte: startDate, $lte: endDate },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                month: { $month: '$createdAt' },
                                year: { $year: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                ])
                .exec()) as AggRow[];

            const result: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const key = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = 0;
            }

            for (const r of reports) {
                const key = moment()
                    .month(Number(r._id.month) - 1)
                    .year(Number(r._id.year))
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = r.count;
            }

            const sorted: Record<string, number> = {};
            const keys = Object.keys(result).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) {
                sorted[k] = result[k];
            }

            return sorted;
        } catch {
            throw new InternalServerErrorException(
                'Unable to retrieve reports count',
            );
        }
    }

    async getClientsOnboardTrend(userSession: UserSession) {
        try {
            if (!hasPerm('crm:view_crm_stats', userSession.permissions)) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startDateStr = now
                .clone()
                .subtract(12, 'months')
                .startOf('month')
                .format('YYYY-MM-DD');
            const endDateStr = now.clone().endOf('month').format('YYYY-MM-DD');

            // Prefill result with last 12 months (including current) as 0
            const result: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const monthKey = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[monthKey] = 0;
            }

            // Query only fields we need
            const reports = await this.reportModel
                .find(
                    {
                        is_lead: false,
                        client_status: 'approved',
                        onboard_date: { $gte: startDateStr, $lte: endDateStr },
                    },
                    { onboard_date: 1, _id: 0 },
                )
                .lean()
                .exec();

            for (const r of reports as Array<{ onboard_date?: string }>) {
                if (!r.onboard_date) continue;
                const key = moment(r.onboard_date, 'YYYY-MM-DD')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                if (Object.prototype.hasOwnProperty.call(result, key)) {
                    result[key] += 1;
                }
            }

            const sorted: Record<string, number> = {};
            const keys = Object.keys(result).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) sorted[k] = result[k];
            return sorted;
        } catch {
            throw new InternalServerErrorException(
                'Unable to retrieve clients onboard count',
            );
        }
    }

    async getTestOrdersTrend(userSession: UserSession) {
        try {
            if (!hasPerm('crm:view_crm_stats', userSession.permissions)) {
                throw new ForbiddenException(
                    'You do not have permission to view CRM stats',
                );
            }

            const now = moment().tz('Asia/Dhaka');
            const startDate = now
                .clone()
                .subtract(12, 'months')
                .startOf('month');
            const endDate = now.clone().endOf('month');

            const result: Record<string, number> = {};
            for (let i = 0; i <= 12; i++) {
                const key = now
                    .clone()
                    .subtract(i, 'months')
                    .format('MMMM_YYYY')
                    .toLowerCase();
                result[key] = 0;
            }

            const reports = await this.reportModel
                .find(
                    {
                        is_lead: false,
                        test_given_date_history: { $exists: true, $ne: [] },
                    },
                    { test_given_date_history: 1, _id: 0 },
                )
                .lean()
                .exec();

            for (const r of reports as Array<{
                test_given_date_history?: string[];
            }>) {
                const dates = r.test_given_date_history || [];
                for (const d of dates) {
                    const m = moment(d, 'YYYY-MM-DD', true);
                    if (!m.isValid()) continue;
                    if (m.isBetween(startDate, endDate, 'day', '[]')) {
                        const key = m.format('MMMM_YYYY').toLowerCase();
                        if (Object.prototype.hasOwnProperty.call(result, key)) {
                            result[key] += 1;
                        }
                    }
                }
            }

            const sorted: Record<string, number> = {};
            const keys = Object.keys(result).sort((a, b) =>
                moment(a, 'MMMM_YYYY').diff(moment(b, 'MMMM_YYYY')),
            );
            for (const k of keys) sorted[k] = result[k];
            return sorted;
        } catch {
            throw new InternalServerErrorException(
                'Unable to retrieve test orders trend',
            );
        }
    }
}
