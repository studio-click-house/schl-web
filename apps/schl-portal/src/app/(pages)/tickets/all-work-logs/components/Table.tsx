'use client';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { formatDate } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';

import { UpdateCommitFormType } from '../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

interface CommitLogItem {
    _id: string;
    ticket_number: string;
    message: string;
    description?: string;
    sha?: string;
    createdAt?: string;
    created_by?: string;
    created_by_name?: string;
}

type CommitLogsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: CommitLogItem[];
};

const Table = () => {
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const canReviewLogs = useMemo(
        () => hasPerm('ticket:review_logs', userPermissions),
        [userPermissions],
    );

    const [logs, setLogs] = useState<CommitLogsState>({
        pagination: { count: 0, pageCount: 0 },
        items: [],
    });

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    // `split` may return undefined for safety, coerce to string
    const today = (new Date().toISOString().split('T')[0] || '') as string;
    const [filters, setFilters] = useState({
        message: '',
        ticketNumber: '',
        createdBy: '',
        fromDate: today,
        toDate: today,
    });

    const getAllLogs = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<CommitLogsState>(
                    {
                        path: '/v1/ticket/search-commit-logs',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
                    },
                );

                if (response.ok) {
                    setLogs(response.data);
                    setIsFiltered(false);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving work logs');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllLogsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<CommitLogsState>(
                    {
                        path: '/v1/ticket/search-commit-logs',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(filters),
                    },
                );

                if (response.ok) {
                    setLogs(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving work logs');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi, filters],
    );

    const fetchLogs = useCallback(async () => {
        if (!isFiltered) {
            await getAllLogs(page, itemPerPage);
        } else {
            await getAllLogsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllLogs, getAllLogsFiltered, page, itemPerPage]);

    const deleteLog = async (commitId: string) => {
        try {
            const response = await authedFetchApi<{ message: string }>(
                { path: `/v1/ticket/delete-commit/${commitId}` },
                {
                    method: 'DELETE',
                },
            );

            if (response.ok) {
                toast.success('Deleted the work log', { id: 'success' });
                await fetchLogs();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting the work log');
        }
    };

    const editLog = async (edited: UpdateCommitFormType & { _id: string }) => {
        try {
            setIsLoading(true);
            const response = await authedFetchApi(
                { path: `/v1/ticket/update-commit/${edited._id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: edited.message,
                        description: edited.description,
                    }),
                },
            );

            if (response.ok) {
                toast.success('Updated work log');
                await fetchLogs();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the work log');
        } finally {
            setIsLoading(false);
        }
    };

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchLogs,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchLogs();
        }
    }, [searchVersion, isFiltered, page]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, []);

    return (
        <>
            <div className="flex flex-col mb-4 gap-2 sm:flex-row sm:justify-end">
                <div className="items-center flex gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e =>
                            setItemPerPage(parseInt(e.target.value, 10))
                        }
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <FilterButton
                        isLoading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (logs?.items?.length !== 0 ? (
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Ticket No</th>
                                    <th>Message</th>
                                    <th>Created By</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.items.map((log, index) => {
                                    const isOwner =
                                        log.created_by === session?.user.db_id;
                                    const canEdit = isOwner;
                                    const canDelete = isOwner || canReviewLogs;

                                    return (
                                        <tr key={log._id}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td>
                                                {log.createdAt
                                                    ? formatDate(log.createdAt)
                                                    : null}
                                            </td>
                                            <td>{log.ticket_number}</td>
                                            <td className="text-wrap">
                                                {log.message}
                                            </td>
                                            <td className="text-wrap">
                                                {log.created_by_name ||
                                                    log.created_by}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    {canEdit && (
                                                        <EditButton
                                                            isLoading={loading}
                                                            commitData={log}
                                                            submitHandler={
                                                                editLog
                                                            }
                                                        />
                                                    )}
                                                    {canDelete && (
                                                        <DeleteButton
                                                            commitId={log._id}
                                                            submitHandler={
                                                                deleteLog
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Work Logs Found" type={Type.danger} />
                    ))}
            </div>
        </>
    );
};

export default Table;
