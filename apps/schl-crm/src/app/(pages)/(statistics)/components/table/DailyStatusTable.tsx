'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { getTodayDate } from '@repo/common/utils/date-helpers';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import FilterButton from './Filter';

interface ReportsStatusState {
    totalCalls: number;
    totalTests: number;
    totalClients: number;
    totalLeads: number;
    totalProspects: number;
}

const countDays = (startDate: string, endDate: string): number => {
    // Parse the input dates using moment
    const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Dhaka');
    const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Dhaka');

    // Calculate the difference in days
    const dayDifference = end.diff(start, 'days');

    // If dates are equal, return 1
    if (dayDifference === 0) {
        return 1;
    }

    // Return the absolute value to ensure the difference is positive
    return Math.abs(dayDifference) + 1;
};

const DailyStatusTable = () => {
    const authedFetchApi = useAuthedFetchApi();
    const callsTargetConst = 50;
    const leadsTargetConst = 20;

    const [reportsStatus, setReportsStatus] = useState<ReportsStatusState>({
        totalCalls: 0,
        totalTests: 0,
        totalClients: 0,
        totalLeads: 0,
        totalProspects: 0,
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { data: session } = useSession();

    const [filters, setFilters] = useState({
        fromDate: getTodayDate(),
        toDate: getTodayDate(),
    });

    const [callsTarget, setCallsTarget] = useState<number>(callsTargetConst);
    const [leadsTarget, setLeadsTarget] = useState<number>(leadsTargetConst);

    const getReportsStatus = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await authedFetchApi<ReportsStatusState>(
                {
                    path: `/v1/report/report-statuses/${session?.user.provided_name}`,
                    query: {
                        fromDate: filters.fromDate || undefined,
                        toDate: filters.toDate || undefined,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    method: 'GET',
                },
            );

            if (response.ok) {
                const data = response.data as ReportsStatusState;
                setReportsStatus(data);
                setCallsTarget(
                    callsTargetConst *
                        countDays(filters.fromDate, filters.toDate),
                );
                setLeadsTarget(
                    leadsTargetConst *
                        countDays(filters.fromDate, filters.toDate),
                );
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                'An error occurred while retrieving daily reports status',
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        authedFetchApi,
        callsTargetConst,
        filters.fromDate,
        filters.toDate,
        leadsTargetConst,
        session?.user.provided_name,
    ]);

    useEffect(() => {
        void getReportsStatus();
    }, [getReportsStatus]);

    return (
        <div className="mt-6">
            <div className="flex flex-col sm:flex-row justify-center gap-1 mb-2 sm:gap-4 sm:mb-0 items-center px-2">
                <p className="font-mono inline-block text-destructive font-extrabold text-md sm:text-lg md:text-xl text-center uppercase">
                    <span className="underline">DAILY TARGET:</span>{' '}
                    {callsTargetConst} CALLS (20 NORMAL, 30 RECALL),{' '}
                    {leadsTargetConst} LEADS, 10 TESTS/MONTH
                </p>
                <FilterButton
                    isLoading={isLoading}
                    submitHandler={getReportsStatus}
                    setFilters={setFilters}
                    filters={filters}
                    className="w-full justify-between sm:w-auto"
                />
            </div>

            <div className="table-responsive text-center text-nowrap text-lg px-2 mt-1">
                <table className="table table-bordered border">
                    <thead>
                        <tr className="bg-gray-50">
                            <th>Calls</th>
                            <th>Leads</th>
                            <th>Tests</th>
                            <th>Prospects</th>
                            <th>Clients</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!isLoading ? (
                            <tr>
                                <td
                                    className={
                                        reportsStatus.totalCalls < callsTarget
                                            ? 'text-destructive'
                                            : 'text-green-400'
                                    }
                                >
                                    {reportsStatus.totalCalls}
                                    {reportsStatus.totalCalls < callsTarget &&
                                        ` (${callsTarget - reportsStatus.totalCalls})`}
                                </td>
                                <td
                                    className={
                                        reportsStatus.totalLeads < leadsTarget
                                            ? 'text-destructive'
                                            : 'text-green-400'
                                    }
                                >
                                    {reportsStatus.totalLeads}
                                    {reportsStatus.totalLeads < leadsTarget &&
                                        ` (${leadsTarget - reportsStatus.totalLeads})`}
                                </td>
                                <td>{reportsStatus.totalTests}</td>
                                <td>{reportsStatus.totalProspects}</td>
                                <td>{reportsStatus.totalClients}</td>
                            </tr>
                        ) : (
                            <tr key={0}>
                                <td
                                    colSpan={5}
                                    className="align-center text-center"
                                >
                                    Loading...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DailyStatusTable;
