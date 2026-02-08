'use client';

import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ShiftTemplate } from '@repo/common/models/shift-template.schema';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

interface ShiftTemplateWithId extends ShiftTemplate {
    _id: string;
}

interface ShiftPlanResponse {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftTemplateWithId[];
}

const Table: React.FC = () => {
    const [shiftPlans, setShiftPlans] = useState<ShiftPlanResponse>({
        pagination: { count: 0, pageCount: 0 },
        items: [],
    });

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const router = useRouter();
    const authedFetchApi = useAuthedFetchApi();

    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        employeeId: '',
        fromDate: '',
        toDate: '',
        shiftType: '',
        active: '',
    });

    const fetchShiftPlans = useCallback(async () => {
        try {
            setLoading(true);

            // Clean filters: remove empty strings and convert to undefined
            const cleanedFilters = Object.entries(filters).reduce(
                (acc, [key, value]) => {
                    if (value && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            );

            const response = await authedFetchApi<ShiftPlanResponse>(
                {
                    path: '/v1/shift-plan/search',
                    query: {
                        page,
                        itemsPerPage: itemPerPage,
                        paginated: true,
                    },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanedFilters),
                },
            );

            if (response.ok) {
                setShiftPlans(response.data);
                setPageCount(response.data.pagination.pageCount);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving shift plans');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, page, itemPerPage, filters]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchShiftPlans,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            fetchShiftPlans();
        }
    }, [searchVersion, page, fetchShiftPlans]);

    const handleSearch = useCallback(() => {
        setPage(prev => {
            if (prev === 1) {
                setSearchVersion(v => v + 1);
                return prev;
            }
            return 1;
        });
    }, []);

    const deleteShiftPlan = useCallback(async (shiftPlan: ShiftTemplate) => {
        toast.error(
            'Shift plans cannot be deleted. Please contact support if changes are needed.',
        );
    }, []);

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '-';
        return timeStr;
    };

    const formatDate = (dateStr: string | Date) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_shift_plan', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:create_shift_plan', userPermissions) && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() =>
                                router.push('/admin/shift-plans/create')
                            }
                            className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                        >
                            Add shift plan
                            <CirclePlus size={18} />
                        </button>
                        <button
                            onClick={() =>
                                router.push(
                                    '/admin/shift-plans/overrides/create',
                                )
                            }
                            className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                        >
                            Add override
                            <CirclePlus size={18} />
                        </button>
                    </div>
                )}

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
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : null}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (shiftPlans.items.length > 0 ? (
                        <>
                            <table className="table border table-bordered table-striped">
                                <thead className="table-dark">
                                    <tr>
                                        <th>S/N</th>
                                        <th>Employee</th>
                                        <th>Effective From</th>
                                        <th>Effective To</th>
                                        <th>Shift Type</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Crosses Midnight</th>
                                        <th>Active</th>
                                        <th>Change Reason</th>
                                        {hasPerm(
                                            'admin:edit_shift_plan',
                                            userPermissions,
                                        ) && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shiftPlans.items.map(
                                        (shiftPlan, index) => (
                                            <tr key={String(shiftPlan._id)}>
                                                <td>
                                                    {(page - 1) * itemPerPage +
                                                        index +
                                                        1}
                                                </td>
                                                <td>
                                                    {shiftPlan.employee &&
                                                    typeof shiftPlan.employee !==
                                                        'string'
                                                        ? (
                                                              shiftPlan.employee as any
                                                          ).real_name
                                                        : 'Unknown'}
                                                </td>
                                                <td className="text-wrap">
                                                    {formatDate(
                                                        shiftPlan.effective_from,
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {formatDate(
                                                        shiftPlan.effective_to,
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                                        {shiftPlan.shift_type}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatTime(
                                                        shiftPlan.shift_start,
                                                    )}
                                                </td>
                                                <td>
                                                    {formatTime(
                                                        shiftPlan.shift_end,
                                                    )}
                                                </td>
                                                <td>
                                                    {shiftPlan.crosses_midnight
                                                        ? '✓'
                                                        : '-'}
                                                </td>
                                                <td>
                                                    {shiftPlan.active
                                                        ? 'Yes'
                                                        : 'No'}
                                                </td>
                                                <td className="text-wrap text-sm">
                                                    {shiftPlan.change_reason ||
                                                        '-'}
                                                </td>
                                                {hasPerm(
                                                    'admin:edit_shift_plan',
                                                    userPermissions,
                                                ) && (
                                                    <td
                                                        className="text-center"
                                                        style={{
                                                            verticalAlign:
                                                                'middle',
                                                        }}
                                                    >
                                                        <div className="inline-block">
                                                            <EditButton
                                                                shiftPlan={
                                                                    shiftPlan
                                                                }
                                                                submitHandler={
                                                                    fetchShiftPlans
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 text-lg">
                                No Shift Plans Found
                            </p>
                        </div>
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
