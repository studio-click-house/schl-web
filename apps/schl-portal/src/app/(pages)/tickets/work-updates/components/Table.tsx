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
} from '@repo/common/utils/date-helpers';
import { SquareArrowOutUpRight } from 'lucide-react';
import FilterButton from './Filter';
import WorkUpdateDelete from './WorkUpdateDelete';

interface WorkUpdate {
    _id: string;
    message: string;
    ticket?: { ticket_number: string };
    submitted_by_name?: string;
    submitted_by: string;
    createdAt: string;
}

// simple array of updates, filters handled separately
interface Props {
    selectedUser: string;
}

const WorkUpdatesTable: React.FC<Props> = ({ selectedUser }) => {
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();

    const [updates, setUpdates] = useState<WorkUpdate[]>([]);

    const [loading, setLoading] = useState<boolean>(true);

    const [filters, setFilters] = useState({
        fromDate: new Date().toISOString().substring(0, 10),
        toDate: new Date().toISOString().substring(0, 10),
    });
    const [isFiltered, setIsFiltered] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const router = useRouter();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const canReviewWork = useMemo(
        () => userPermissions.includes('ticket:review_works'),
        [userPermissions],
    );


    const getAllUpdates = useCallback(async () => {
        setLoading(true);
        try {
            const body: any = {};
            if (selectedUser) {
                body.submitted_by = selectedUser;
            }

            const resp = await authedFetchApi<WorkUpdate[]>(
                {
                    path: '/v1/daily-update/search-daily-updates',
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
                setUpdates(resp.data as WorkUpdate[]);
            } else {
                toastFetchError(resp);
            }
        } catch (err) {
            console.error(err);
            toast.error('Unable to load work updates');
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

            const resp = await authedFetchApi<WorkUpdate[]>(
                {
                    path: '/v1/daily-update/search-daily-updates',
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
                setUpdates(resp.data as WorkUpdate[]);
            } else {
                toastFetchError(resp);
            }
        } catch (err) {
            console.error(err);
            toast.error('Unable to load work updates');
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

    useEffect(() => {
        fetchUpdates();
    }, [selectedUser, searchVersion, fetchUpdates]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setSearchVersion(v => v + 1);
    }, []);

    useEffect(() => {
        if (!canReviewWork) {
            router.push('/');
            return;
        }
    }, [canReviewWork, router]);

    return (
        <div className="w-full">
            <div className="flex items-center mb-4 gap-2 justify-end">
                <FilterButton
                    filters={filters}
                    setFilters={setFilters}
                    submitHandler={handleSearch}
                    loading={loading}
                />
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
                                <col className="w-auto" />
                                <col className="w-32" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-50 whitespace-nowrap">
                                    <th>S/N</th>
                                    <th>Date</th>
                                    {!selectedUser && <th>Submitted By</th>}
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
                                            <td className="text-balance">{update.submitted_by_name || "N/A"}</td>
                                        )}
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
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <NoData text="No work updates found" type={Type.danger} />
                ))}
        </div>
    );
};

export default WorkUpdatesTable;
