'use client';

import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
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
import { ShiftAdjustmentFormData } from '../schema';
import BulkDeactivate from './BulkDeactivate';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

import { ShiftAdjustment } from '@repo/common/models/shift-adjustment.schema';

interface ShiftAdjustmentWithId extends ShiftAdjustment {
    _id: string;
}

interface AdjustmentResponse {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftAdjustmentWithId[];
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
        active: 'true',
    };
};

const Table: React.FC = () => {
    const [adjustments, setAdjustments] = useState<AdjustmentResponse>({
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

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const fetchAdjustments = useCallback(async () => {
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

            const response = await authedFetchApi<AdjustmentResponse>(
                {
                    path: '/v1/shift-adjustment/search',
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
                setAdjustments(response.data);
                setPageCount(response.data.pagination.pageCount);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving adjustments');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, page, itemPerPage, appliedFilters]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchAdjustments,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            fetchAdjustments();
        }
    }, [searchVersion, page, fetchAdjustments]);

    const handleSearch = useCallback(
        (overrideFilters?: any) => {
            setAppliedFilters(overrideFilters || filters);
            setPage(1);
            setSearchVersion(v => v + 1);
        },
        [filters],
    );

    // --- Multi-select helpers ---
    const currentPageActiveIds = useMemo(() => {
        const today = moment.tz('Asia/Dhaka').startOf('day');
        return adjustments.items
            .filter(
                t =>
                    t.active &&
                    moment
                        .tz(t.shift_date, 'Asia/Dhaka')
                        .startOf('day')
                        .isAfter(today),
            )
            .map(t => t._id.toString());
    }, [adjustments.items]);

    const allCurrentPageSelected =
        currentPageActiveIds.length > 0 &&
        currentPageActiveIds.every(id => selectedIds.has(id));

    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allCurrentPageSelected) {
                currentPageActiveIds.forEach(id => next.delete(id));
            } else {
                currentPageActiveIds.forEach(id => next.add(id));
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
                                router.push(
                                    '/admin/shift-adjustments/create-adjustment',
                                )
                            }
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 whitespace-nowrap rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                        >
                            Add adjustment
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

            {/* Bulk action toolbar */}
            <BulkDeactivate
                selectedIds={selectedIds}
                onSuccess={() => {
                    setSelectedIds(new Set());
                    fetchAdjustments();
                }}
                onClearSelection={() => setSelectedIds(new Set())}
                canEdit={canEdit}
            />

            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : null}

            {/* Table */}
            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (adjustments.items.length > 0 ? (
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
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Details</th>
                                        <th>Active</th>
                                        <th>Reason</th>
                                        {canEdit && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {adjustments.items.map((item, index) => (
                                        <tr key={item._id}>
                                            {canEdit && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="flex justify-center items-center h-full py-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(
                                                                item._id.toString(),
                                                            )}
                                                            onChange={() =>
                                                                toggleSelectOne(
                                                                    item._id.toString(),
                                                                )
                                                            }
                                                            disabled={
                                                                !item.active ||
                                                                !moment
                                                                    .tz(
                                                                        item.shift_date,
                                                                        'Asia/Dhaka',
                                                                    )
                                                                    .startOf(
                                                                        'day',
                                                                    )
                                                                    .isAfter(
                                                                        moment
                                                                            .tz(
                                                                                'Asia/Dhaka',
                                                                            )
                                                                            .startOf(
                                                                                'day',
                                                                            ),
                                                                    )
                                                            }
                                                            className="w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer disabled:cursor-not-allowed"
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
                                                {item.employee &&
                                                typeof item.employee !==
                                                    'string'
                                                    ? `${(item.employee as any).real_name} (${(item.employee as any).e_id})`
                                                    : 'Unknown'}
                                            </td>
                                            <td className="text-wrap">
                                                {formatDate(item.shift_date)}
                                            </td>
                                            <td>
                                                <Badge
                                                    value={capitalize(
                                                        item.adjustment_type?.replace(
                                                            '_',
                                                            ' ',
                                                        ),
                                                    )}
                                                />
                                            </td>
                                            <td>
                                                {item.adjustment_type ===
                                                'replace' ? (
                                                    <div>
                                                        {capitalize(
                                                            item.shift_type ||
                                                                'Custom',
                                                        )}
                                                        :{' '}
                                                        {item.shift_start
                                                            ? formatTime(
                                                                  item.shift_start,
                                                              )
                                                            : '--:--'}{' '}
                                                        -{' '}
                                                        {item.shift_end
                                                            ? formatTime(
                                                                  item.shift_end,
                                                              )
                                                            : '--:--'}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>

                                            <td>{item.active ? 'Yes' : '-'}</td>
                                            <ExtendableTd
                                                data={item.comment || '-'}
                                            />
                                            {canEdit && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="flex gap-2 justify-center">
                                                        <EditButton
                                                            adjustment={item}
                                                            submitHandler={
                                                                fetchAdjustments
                                                            }
                                                        />
                                                        {item.active && (
                                                            <>
                                                                {moment
                                                                    .tz(
                                                                        item.shift_date,
                                                                        'Asia/Dhaka',
                                                                    )
                                                                    .startOf(
                                                                        'day',
                                                                    )
                                                                    .isAfter(
                                                                        moment
                                                                            .tz(
                                                                                'Asia/Dhaka',
                                                                            )
                                                                            .startOf(
                                                                                'day',
                                                                            ),
                                                                    ) ? (
                                                                    <DeleteButton
                                                                        adjustmentId={
                                                                            item._id
                                                                        }
                                                                        onSuccess={
                                                                            fetchAdjustments
                                                                        }
                                                                    />
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <NoData
                            text="No Shift Adjustments Found"
                            type={Type.danger}
                        />
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
