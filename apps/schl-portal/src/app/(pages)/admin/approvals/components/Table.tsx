'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { ApprovalDocument } from '@repo/common/models/approval.schema';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import { CircleCheckBig, CircleX } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import FilterButton from './Filter';
import ViewButton from './View';

export interface PopulatedApprovalType
    extends Omit<ApprovalDocument, 'req_by' | 'rev_by'> {
    req_by: {
        real_name: string;
    };
    rev_by: {
        real_name: string;
    };
}

type ApprovalsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: PopulatedApprovalType[];
};

const Table: React.FC = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [approvals, setApprovals] = useState<ApprovalsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [approvalIds, setApprovalIds] = useState<string[]>([]);

    const { data: session } = useSession();

    const [filters, setFilters] = useState({
        reqBy: '',
        reqType: '',
        approvedCheck: false,
        rejectedCheck: false,
        waitingCheck: false,
        fromDate: '',
        toDate: '',
    });

    const getAllApprovals = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setLoading(true);

                const response = await authedFetchApi<ApprovalsState>(
                    {
                        path: '/v1/approval/search-approvals',
                        query: {
                            paginated: true,
                            filtered: false,
                            itemsPerPage: itemPerPage,
                            page,
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
                    setApprovals(response.data);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving approvals data',
                );
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllApprovalsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setLoading(true);

                const response = await authedFetchApi<ApprovalsState>(
                    {
                        path: '/v1/approval/search-approvals',
                        query: {
                            paginated: true,
                            filtered: true,
                            itemsPerPage: itemPerPage,
                            page,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            ...filters,
                        }),
                    },
                );

                if (response.ok) {
                    setApprovals(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving approvals data',
                );
            } finally {
                setLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const singleApproval = async (
        req_id: string,
        res: 'approve' | 'reject',
    ) => {
        try {
            const toastId = toast.loading(
                'Sending request for approval...',
            ) as string;
            const response = await authedFetchApi<{ message: string }>(
                { path: '/v1/approval/single-response' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        response: res,
                        objectId: req_id,
                        reviewedBy: session?.user?.db_id,
                    }),
                },
            );

            if (response.ok) {
                toast.success('Request processed successfully', {
                    id: toastId,
                });
                await fetchApprovals();
            } else {
                toastFetchError(response, toastId);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    };

    const multipleApproval = async (res: 'approve' | 'reject') => {
        try {
            const toastId = toast.loading(
                'Sending request for approval...',
            ) as string;
            const response = await authedFetchApi<{ message: string }>(
                { path: '/v1/approval/bulk-response' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        response: res,
                        objectIds: approvalIds,
                        reviewedBy: session?.user?.db_id,
                    }),
                },
            );

            if (response.ok) {
                toast.success(
                    'Checked ' + approvalIds.length + ' approval requests',
                    {
                        id: toastId,
                    },
                );
                setApprovalIds([]);
                await fetchApprovals();
            } else {
                toastFetchError(response, toastId);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    };

    // Function to handle the "Select All" checkbox
    const handleSelectAll = (e: any) => {
        if (e.target.checked) {
            // If "Select All" is checked, select all rows
            const allIds = approvals?.items
                ?.filter(item => item.status === 'pending')
                .map(item => String(item._id));
            setApprovalIds(allIds);
        } else {
            // If "Select All" is unchecked, clear all selections
            setApprovalIds([]);
        }
    };

    // Function to handle individual checkbox selection
    const handleCheckboxChange = (id: string) => {
        // Toggle the selection of the checkbox
        setApprovalIds(prevIds => {
            if (prevIds.includes(id)) {
                // If already selected, remove from selection
                return prevIds.filter(rowId => rowId !== id);
            } else {
                // If not selected, add to selection
                return [...prevIds, id];
            }
        });
    };

    const fetchApprovals = useCallback(async () => {
        if (!isFiltered) {
            await getAllApprovals(page, itemPerPage);
        } else {
            await getAllApprovalsFiltered(page, itemPerPage);
        }
    }, [
        isFiltered,
        getAllApprovals,
        getAllApprovalsFiltered,
        page,
        itemPerPage,
    ]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchApprovals,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchApprovals();
        }
    }, [fetchApprovals, isFiltered, page, searchVersion]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [setIsFiltered, setPage]);

    return (
        <>
            <div className="flex flex-col justify-center sm:flex-row sm:justify-end mb-4 gap-2">
                <div className="items-center flex gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
                        // defaultValue={30}
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <FilterButton
                        loading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
                <div className="float-start flex items-center">
                    {approvalIds.length !== 0 && (
                        <div className="flex items-center gap-1 ms-4">
                            <span className="inline-flex items-center text-xs sm:text-sm font-medium bg-gray-200 px-2 py-2 rounded-md min-w-[24px] text-center">
                                {approvalIds.length}
                            </span>
                            <button
                                onClick={() => {
                                    const confirmation = confirm(
                                        'Are you sure you want to approve selected requests?',
                                    );
                                    if (confirmation) {
                                        multipleApproval('approve');
                                    }
                                }}
                                className="rounded-md bg-green-600 hover:opacity-90 hover:ring-2 hover:ring-green-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-1 sm:p-2"
                            >
                                <CircleCheckBig
                                    size={16}
                                    className="sm:w-[18px] sm:h-[18px]"
                                />
                            </button>
                            <button
                                onClick={() => {
                                    const confirmation = confirm(
                                        'Are you sure you want to reject selected requests?',
                                    );
                                    if (confirmation) {
                                        multipleApproval('reject');
                                    }
                                }}
                                className="rounded-md bg-red-600 hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-1 sm:p-2"
                            >
                                <CircleX
                                    size={16}
                                    className="sm:w-[18px] sm:h-[18px]"
                                />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (approvals?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th
                                        className="text-center"
                                        style={{ verticalAlign: 'middle' }}
                                    >
                                        <div className="flex justify-center items-center h-full py-1">
                                            <input
                                                type="checkbox"
                                                id="selectAllCheckbox"
                                                disabled={
                                                    approvals?.items?.length ===
                                                        0 ||
                                                    approvals?.items?.filter(
                                                        item =>
                                                            item.status ===
                                                            'pending',
                                                    ).length === 0
                                                }
                                                checked={
                                                    approvalIds.length ===
                                                        approvals?.items?.filter(
                                                            item =>
                                                                item.status ===
                                                                'pending',
                                                        ).length &&
                                                    approvals?.items?.filter(
                                                        item =>
                                                            item.status ===
                                                            'pending',
                                                    ).length !== 0
                                                }
                                                className="disabled:cursor-default w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer"
                                                onChange={handleSelectAll}
                                            />
                                        </div>
                                    </th>
                                    <th>Requester</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                    <th>Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvals?.items?.map((approval, index) => (
                                    <tr key={String(approval._id)}>
                                        <td
                                            className="text-center"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            <div className="flex justify-center items-center h-full py-1">
                                                <input
                                                    disabled={
                                                        approval.status !==
                                                        'pending'
                                                    }
                                                    type="checkbox"
                                                    id={`checkbox_${String(approval._id)}`}
                                                    className="disabled:cursor-default w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer"
                                                    checked={approvalIds.includes(
                                                        String(approval._id),
                                                    )}
                                                    onChange={() =>
                                                        handleCheckboxChange(
                                                            String(
                                                                approval._id,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </div>
                                        </td>
                                        <td className="text-wrap">
                                            {approval.req_by.real_name}
                                        </td>
                                        <td
                                            className="uppercase text-wrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            {approval.status == 'rejected' ? (
                                                <Badge
                                                    value={'Rejected'}
                                                    className="bg-red-600 text-white border-red-600"
                                                />
                                            ) : approval.status ==
                                              'approved' ? (
                                                <Badge
                                                    value={'Approved'}
                                                    className="bg-green-600 text-white border-green-600"
                                                />
                                            ) : (
                                                <Badge
                                                    value={'Pending'}
                                                    className="bg-amber-600 text-white border-amber-600"
                                                />
                                            )}
                                        </td>
                                        <td
                                            className="text-center"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            <Badge
                                                value={`${approval.target_model} ${approval.action}`}
                                                className="uppercase"
                                            />
                                        </td>
                                        <td className="text-wrap">
                                            {formatDate(approval.createdAt!)}
                                            {' | '}
                                            {formatTime(
                                                formatTimestamp(
                                                    approval.createdAt!,
                                                ).time,
                                            )}
                                        </td>
                                        <td
                                            className="text-center"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            <div className="flex justify-center items-center h-full py-1">
                                                <div className="flex gap-2">
                                                    {approval.status ==
                                                        'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    singleApproval(
                                                                        String(
                                                                            approval._id,
                                                                        ),
                                                                        'approve',
                                                                    )
                                                                }
                                                                className="rounded-md bg-green-600 hover:opacity-90 hover:ring-2 hover:ring-green-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 flex items-center"
                                                            >
                                                                <CircleCheckBig
                                                                    size={18}
                                                                />
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    singleApproval(
                                                                        String(
                                                                            approval._id,
                                                                        ),
                                                                        'reject',
                                                                    )
                                                                }
                                                                className="rounded-md bg-red-600 hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 flex items-center"
                                                            >
                                                                <CircleX
                                                                    size={18}
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                    <ViewButton
                                                        approvalData={approval}
                                                        loading={loading}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Requests Found" type={Type.danger} />
                    ))}
            </div>
            <style jsx>
                {`
                    th,
                    td {
                        padding: 2.5px 10px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
