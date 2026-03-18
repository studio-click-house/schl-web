'use client';
import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
import { formatDate, formatTime } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { capitalize } from 'lodash';
import { Ban, CirclePlus, ClockCheck, X } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import BulkDeactivateModal from './BulkDeactivateModal';
import EditButton from './Edit';
import FilterButton from './Filter';

interface ShiftPlanWithId extends ShiftPlan {
    _id: string;
}

interface ShiftPlanResponse {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftPlanWithId[];
}

type EmployeeOption = {
    value: string;
    label: string;
};

const getDefaultFilters = () => {
    const today = moment.tz('Asia/Dhaka');
    const monday = today.clone().startOf('isoWeek').format('YYYY-MM-DD');
    const sunday = today.clone().endOf('isoWeek').format('YYYY-MM-DD');
    return {
        employeeId: '',
        fromDate: monday,
        toDate: sunday,
        shiftType: '',
        active: 'true',
        department: '',
    };
};

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

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    const [filters, setFilters] = useState(getDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(getDefaultFilters);
    const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>(
        [],
    );

    const getEmployeesForFilter = useCallback(async () => {
        try {
            const response = await authedFetchApi<any[]>(
                {
                    path: '/v1/employee/search-employees',
                    query: { paginated: false },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                },
            );

            if (response.ok) {
                const options = (response.data || []).map((employee: any) => ({
                    value: String(employee._id),
                    label: `${employee.real_name} (${employee.e_id})`,
                }));
                setEmployeeOptions(options);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving employee list');
        }
    }, [authedFetchApi]);

    useEffect(() => {
        getEmployeesForFilter();
    }, [getEmployeesForFilter]);
    const fetchShiftPlans = useCallback(async () => {
        try {
            setLoading(true);
            setSelectedIds(new Set()); // clear selection on fetch

            const cleanedFilters = Object.entries(appliedFilters).reduce(
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
    }, [authedFetchApi, page, itemPerPage, appliedFilters]);

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
        setAppliedFilters(filters);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [filters]);

    // --- Multi-select helpers ---
    const currentPageIds = useMemo(
        () => shiftPlans.items.map(t => t._id.toString()),
        [shiftPlans.items],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every(id => selectedIds.has(id));

    const someCurrentPageSelected = currentPageIds.some(id =>
        selectedIds.has(id),
    );

    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allCurrentPageSelected) {
                currentPageIds.forEach(id => next.delete(id));
            } else {
                currentPageIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // --- Bulk deactivate ---
    const handleBulkDeactivate = async (comment: string) => {
        try {
            setBulkLoading(true);
            const response = await authedFetchApi<any>(
                { path: '/v1/shift-plan/bulk-deactivate' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ids: Array.from(selectedIds),
                        ...(comment ? { comment } : {}),
                    }),
                },
            );

            if (response.ok) {
                toast.success(
                    `Deactivated ${response.data?.deactivated ?? selectedIds.size} shift plan(s)`,
                );
                setBulkModalOpen(false);
                setSelectedIds(new Set());
                fetchShiftPlans();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deactivating shift plans');
        } finally {
            setBulkLoading(false);
        }
    };

    const canEdit = hasPerm('admin:edit_shift_plan', userPermissions);

    return (
        <>
            {/* Top bar */}
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2 sm:items-center',
                    hasPerm('admin:create_shift_plan', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:create_shift_plan', userPermissions) && (
                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <button
                            onClick={() =>
                                router.push('/admin/shift-plans/create-plan')
                            }
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 whitespace-nowrap rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
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
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 whitespace-nowrap rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                        >
                            Add override
                            <CirclePlus size={18} />
                        </button>
                    </div>
                )}

                {(filters.fromDate || filters.toDate) && (
                    <div className="flex justify-center sm:justify-start w-full sm:w-auto items-center text-xl text-gray-900 font-semibold">
                        {filters.fromDate && (
                            <span className="flex items-center">
                                <ClockCheck size={23} className="mr-2" />
                                {formatDate(filters.fromDate)}
                                {filters.toDate && ' –'}
                            </span>
                        )}
                        {filters.toDate && (
                            <span className="ml-1">
                                {formatDate(filters.toDate)}
                            </span>
                        )}
                    </div>
                )}

                <div className="items-center flex justify-between w-full sm:w-auto gap-2">
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
                        employeeOptions={employeeOptions}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {/* Bulk action toolbar — only shown when rows are selected */}
            {selectedIds.size > 0 && canEdit && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-md flex items-center shadow-sm">
                        {selectedIds.size}{' '}
                        {selectedIds.size === 1 ? 'Plan' : 'Plans'} Selected
                    </span>
                    <button
                        type="button"
                        onClick={() => setBulkModalOpen(true)}
                        title="Deactivate Selected"
                        className="flex items-center gap-2 rounded-md bg-red-600 hover:opacity-90 hover:ring-4 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        <Ban size={19} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        title="Clear Selection"
                        className="flex items-center gap-2 rounded-md bg-gray-500 hover:opacity-90 hover:ring-4 hover:ring-gray-500 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        <X size={19} />
                    </button>
                </div>
            )}

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
                                        {canEdit && (
                                            <th className="text-center">
                                                <div className="flex justify-center items-center h-full py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            allCurrentPageSelected
                                                        }
                                                        onChange={
                                                            toggleSelectAll
                                                        }
                                                        className="w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer"
                                                    />
                                                </div>
                                            </th>
                                        )}
                                        <th>S/N</th>
                                        <th>Employee</th>
                                        <th>Effective From</th>
                                        <th>Effective To</th>
                                        <th>Shift Type</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Crosses Midnight</th>
                                        <th>Active</th>
                                        <th>Comment</th>
                                        {canEdit && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {shiftPlans.items.map(
                                        (shiftPlan, index) => (
                                            <tr key={String(shiftPlan._id)}>
                                                {canEdit && (
                                                    <td
                                                        className="text-center"
                                                        style={{
                                                            verticalAlign:
                                                                'middle',
                                                        }}
                                                    >
                                                        <div className="flex justify-center items-center h-full py-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(
                                                                    shiftPlan._id.toString(),
                                                                )}
                                                                onChange={() =>
                                                                    toggleSelectOne(
                                                                        shiftPlan._id.toString(),
                                                                    )
                                                                }
                                                                className="w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer"
                                                            />
                                                        </div>
                                                    </td>
                                                )}
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
                                                    <Badge
                                                        value={capitalize(
                                                            shiftPlan.shift_type,
                                                        )}
                                                    />
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
                                                        ? 'Yes'
                                                        : '-'}
                                                </td>
                                                <td>
                                                    {shiftPlan.active
                                                        ? 'Yes'
                                                        : '-'}
                                                </td>
                                                <ExtendableTd
                                                    data={
                                                        shiftPlan.comment || '-'
                                                    }
                                                />
                                                {canEdit && (
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
                        <NoData
                            text="No Shift Plans Found"
                            type={Type.danger}
                        />
                    ))}
            </div>

            <BulkDeactivateModal
                isOpen={bulkModalOpen}
                isLoading={bulkLoading}
                selectedCount={selectedIds.size}
                onClose={() => setBulkModalOpen(false)}
                onConfirm={handleBulkDeactivate}
            />

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
