'use client';
import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ShiftTemplate } from '@repo/common/models/shift-template.schema';
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
import NoData, { Type } from '@/components/NoData';
import { formatDate, formatTime } from '@repo/common/utils/date-helpers';

interface ShiftTemplateWithId extends ShiftTemplate {
    _id: string;
}

interface ShiftTemplateResponse {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftTemplateWithId[];
}

const Table: React.FC = () => {
    const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplateResponse>(
        {
            pagination: { count: 0, pageCount: 0 },
            items: [],
        },
    );

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

    const [filters, setFilters] = useState(() => {
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
    });

    const fetchShiftTemplates = useCallback(async () => {
        try {
            setLoading(true);
            setSelectedIds(new Set()); // clear selection on fetch

            const cleanedFilters = Object.entries(filters).reduce(
                (acc, [key, value]) => {
                    if (value && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            );

            const response = await authedFetchApi<ShiftTemplateResponse>(
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
                setShiftTemplates(response.data);
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
        triggerFetch: fetchShiftTemplates,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            fetchShiftTemplates();
        }
    }, [searchVersion, page, fetchShiftTemplates]);

    const handleSearch = useCallback(() => {
        setPage(prev => {
            if (prev === 1) {
                setSearchVersion(v => v + 1);
                return prev;
            }
            return 1;
        });
    }, []);

    // --- Multi-select helpers ---
    const currentPageIds = useMemo(
        () => shiftTemplates.items.map(t => t._id.toString()),
        [shiftTemplates.items],
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
                fetchShiftTemplates();
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
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() =>
                                router.push('/admin/shift-plans/create-plan')
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

                {(filters.fromDate || filters.toDate) && (
                    <div className="flex items-center text-xl text-gray-900 font-semibold">
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
                    (shiftTemplates.items.length > 0 ? (
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
                                    {shiftTemplates.items.map(
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
                                                        className="text-white bg-blue-600 border border-blue-600"
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
                                                        ? '✓'
                                                        : '-'}
                                                </td>
                                                <td>
                                                    {shiftPlan.active
                                                        ? 'Yes'
                                                        : 'No'}
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
                                                                    fetchShiftTemplates
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
                        <NoData text="No Shift Templates Found" type={Type.danger} />
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

