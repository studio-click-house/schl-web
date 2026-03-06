'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import ExtendableTd from '@/components/ExtendableTd';
import NoData, { Type } from '@/components/NoData';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import {
    formatDate,
    formatTime,
    formatTimestamp,
    getTodayDate,
} from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import {
    BadgeCheck,
    CheckCheck,
    ClipboardClock,
    ClockCheck,
    SquareArrowOutUpRight,
} from 'lucide-react';
import { DailyReportFormData } from '../../active-jobs/components/daily-report/schema';
import DailyReportDelete from './Delete';
import EditDailyReportModal from './EditModal';
import FilterButton from './Filter';

interface DailyReport {
    _id: string;
    message: string;
    ticket?: { ticket_number: string };
    ticket_id?: string;
    submitted_by_name?: string;
    submitted_by: string;
    createdAt: string;
    is_verified?: boolean;
    verified_by_name?: string | null;
    updatedAt: string;
}

// simple array of updates, filters handled separately
interface Props {
    selectedUser: string;
}

const DailyReportsTable: React.FC<Props> = ({ selectedUser }) => {
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();

    const [updates, setUpdates] = useState<DailyReport[]>([]);

    const [loading, setLoading] = useState<boolean>(true);

    const [filters, setFilters] = useState({
        fromDate: getTodayDate(),
        toDate: '',
    });
    const [isFiltered, setIsFiltered] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const canDeleteDailyReport = useMemo(
        () => userPermissions.includes('ticket:delete_daily_report'),
        [userPermissions],
    );

    const canVerifyDailyReport = useMemo(
        () => userPermissions.includes('ticket:review_reports'),
        [userPermissions],
    );

    const getAllUpdates = useCallback(async () => {
        setLoading(true);
        try {
            const body: any = {};
            if (selectedUser) {
                body.submitted_by = selectedUser;
            }

            const resp = await authedFetchApi<DailyReport[]>(
                {
                    path: '/v1/daily-report/search-daily-reports',
                    query: { paginated: false },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            if (resp.ok) {
                setIsFiltered(false);
                setUpdates(resp.data as DailyReport[]);
            } else {
                toastFetchError(resp);
            }
        } catch (err) {
            console.error(err);
            toast.error('Unable to load daily reports');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, selectedUser]);

    // fetch using current date filters (and selectedUser)
    const getFilteredUpdates = useCallback(async () => {
        setLoading(true);
        try {
            const body: any = {};
            if (selectedUser) body.submitted_by = selectedUser;
            if (filters.fromDate) body.fromDate = filters.fromDate;
            if (filters.toDate) body.toDate = filters.toDate;

            const resp = await authedFetchApi<DailyReport[]>(
                {
                    path: '/v1/daily-report/search-daily-reports',
                    query: { paginated: false },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            if (resp.ok) {
                setIsFiltered(true);
                setUpdates(resp.data as DailyReport[]);
            } else {
                toastFetchError(resp);
            }
        } catch (err) {
            console.error(err);
            toast.error('Unable to load daily reports');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, selectedUser, filters]);

    const fetchUpdates = useCallback(async () => {
        if (!isFiltered) {
            await getAllUpdates();
        } else {
            await getFilteredUpdates();
        }
    }, [getAllUpdates, getFilteredUpdates, isFiltered]);

    const deleteDailyReport = async (dailyReportData: { _id: string }) => {
        try {
            const response = await authedFetchApi<{ message: string }>(
                {
                    path: `/v1/daily-report/delete-daily-report/${dailyReportData._id}`,
                },
                {
                    method: 'DELETE',
                },
            );

            if (response.ok) {
                toast.success('Deleted the daily report successfully', {
                    id: 'success',
                });
                await fetchUpdates();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting the daily report');
        }
    };

    const verifyDailyReport = async (dailyReportData: { _id: string }) => {
        try {
            const response = await authedFetchApi<DailyReport>(
                {
                    path: `/v1/daily-report/verify-daily-report/${dailyReportData._id}`,
                },
                {
                    method: 'POST',
                },
            );

            if (response.ok) {
                toast.success('Daily report verified', { id: 'success' });
                await fetchUpdates();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while verifying the daily report');
        }
    };

    const updateDailyReport = async (
        data: DailyReportFormData & { _id: string },
    ) => {
        try {
            const { _id, ...body } = data;
            const response = await authedFetchApi<{ message: string }>(
                {
                    path: `/v1/daily-report/update-daily-report/${_id}`,
                },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            if (response.ok) {
                toast.success('Updated the daily report');
                await fetchUpdates();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the daily report');
        }
    };

    useEffect(() => {
        fetchUpdates();
    }, [selectedUser, searchVersion, fetchUpdates]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setSearchVersion(v => v + 1);
    }, []);

    return (
        <div className="w-full">
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2 sm:flex-row sm:justify-between items-center',
                )}
            >
                {(filters.fromDate || filters.toDate) && (
                    <div className="text-xl text-gray-900 font-semibold items-center">
                        {filters.fromDate && (
                            <span>
                                <ClockCheck
                                    size={23}
                                    className="inline mb-1 mr-2"
                                />
                                {formatDate(filters.fromDate)}
                                {filters.toDate && ` – `}
                            </span>
                        )}
                        {filters.toDate && (
                            <span>{formatDate(filters.toDate)}</span>
                        )}
                    </div>
                )}

                <div className="items-center flex gap-2">
                    <FilterButton
                        filters={filters}
                        setFilters={setFilters}
                        submitHandler={handleSearch}
                        loading={loading}
                    />
                </div>
            </div>
            {loading && <p className="text-center">Loading...</p>}
            {!loading &&
                (updates.length > 0 ? (
                    <div className="table-responsive text-md overflow-x-auto w-full">
                        <table className="table border-gray-300 table-bordered w-full table-fixed">
                            <colgroup>
                                <col className="w-16" />
                                <col className="w-52" />
                                {!selectedUser && <col className="w-32" />}
                                <col className="w-52" />
                                <col className="w-32" />
                                <col className="w-auto" />
                                <col className="w-32" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-50 whitespace-nowrap">
                                    <th>S/N</th>
                                    <th>Date</th>
                                    {!selectedUser && <th>Submitted By</th>}
                                    <th>Verified At</th>
                                    <th>Verified By</th>
                                    <th>Message</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-base">
                                {updates.map((update, i) => (
                                    <tr key={update._id}>
                                        <td>{i + 1}</td>
                                        <td className="whitespace-nowrap">
                                            {`${formatDate(update.createdAt)} | ${formatTime(
                                                formatTimestamp(
                                                    update.createdAt,
                                                ).time,
                                            )}`}
                                        </td>
                                        {!selectedUser && (
                                            <td className="text-balance">
                                                {update.submitted_by_name ||
                                                    'N/A'}
                                            </td>
                                        )}
                                        {/* if a work update is verified that means edit permissions are revoked, so show the latest update time is the verified time */}
                                        <td className="text-balance">
                                            {update.is_verified
                                                ? `${formatDate(update.updatedAt)} | ${formatTime(
                                                      formatTimestamp(
                                                          update.updatedAt,
                                                      ).time,
                                                  )}`
                                                : 'N/A'}
                                        </td>
                                        <td className="text-balance">
                                            {update.verified_by_name || 'N/A'}
                                        </td>
                                        <td className="text-pretty">
                                            {update.message}
                                        </td>

                                        <td
                                            className="whitespace-nowrap"
                                            style={{
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <div className="inline-block">
                                                <div className="flex gap-2">
                                                    {update.ticket
                                                        ?.ticket_number && (
                                                        <Link
                                                            href={`/tickets/${update.ticket.ticket_number}`}
                                                            target="_blank"
                                                            className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                        >
                                                            <SquareArrowOutUpRight
                                                                size={16}
                                                            />
                                                        </Link>
                                                    )}
                                                    {canVerifyDailyReport &&
                                                        !update.is_verified && (
                                                            <button
                                                                onClick={() =>
                                                                    verifyDailyReport(
                                                                        {
                                                                            _id: update._id,
                                                                        },
                                                                    )
                                                                }
                                                                className="items-center gap-2 rounded-md bg-green-600 hover:opacity-90 hover:ring-2 hover:ring-green-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                            >
                                                                <CheckCheck
                                                                    size={16}
                                                                />
                                                            </button>
                                                        )}
                                                    {!update.is_verified &&
                                                        (canVerifyDailyReport ||
                                                            session?.user
                                                                .db_id ===
                                                                update.submitted_by) && (
                                                            <EditDailyReportModal
                                                                reportData={
                                                                    update
                                                                }
                                                                canReviewReports={
                                                                    canVerifyDailyReport
                                                                }
                                                                submitHandler={
                                                                    updateDailyReport
                                                                }
                                                            />
                                                        )}
                                                    {canDeleteDailyReport && (
                                                        <DailyReportDelete
                                                            submitHandler={
                                                                deleteDailyReport
                                                            }
                                                            dailyReportData={{
                                                                _id: update._id,
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <NoData text="No daily reports found" type={Type.danger} />
                ))}
        </div>
    );
};

export default DailyReportsTable;
