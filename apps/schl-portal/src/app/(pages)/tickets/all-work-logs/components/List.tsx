'use client';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UpdateCommitFormType } from '../schema';
import CommitCard, { CommitLogItem } from './Card';
import FilterButton from './Filter';

type CommitLogsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: CommitLogItem[];
};

const List = () => {
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
    const [loading, setLoading] = useState<boolean>(true);
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
                setLoading(false);
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
                setLoading(false);
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
            setLoading(true);
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
            setLoading(false);
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

            {loading && <p className="text-center">Loading...</p>}

            {!loading &&
                (logs.items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {logs.items.map((log, index) => {
                            const isOwner =
                                log.created_by === session?.user.db_id;
                            const canDelete = isOwner || canReviewLogs;

                            return (
                                <CommitCard
                                    key={log._id}
                                    log={log}
                                    index={index}
                                    page={page}
                                    itemPerPage={itemPerPage}
                                    isOwner={isOwner}
                                    canDelete={canDelete}
                                    onEdit={editLog}
                                    onDelete={deleteLog}
                                    isLoading={loading}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <NoData text="No Work Logs Found" type={Type.danger} />
                ))}
        </>
    );
};

export default List;
