'use client';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { Holiday } from '@repo/common/models/holiday.schema';
import { formatDate } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Ban, ClockCheck } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HolidayData } from '../schema';
import CreateButton from './Create';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';
import BulkDeactivate from './BulkDeactivate';

interface HolidayWithId extends Omit<Holiday, 'flag'> {
    _id: string;
}

type HolidayState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: (HolidayWithId & { active?: boolean })[];
};

const getDefaultFilters = () => {
    const today = moment.tz('Asia/Dhaka');
    const startOfYear = today.clone().startOf('year').format('YYYY-MM-DD');
    const endOfYear = today.clone().endOf('year').format('YYYY-MM-DD');
    return {
        name: '',
        fromDate: startOfYear,
        toDate: endOfYear,
        active: 'true',
    };
};

const Table: React.FC = () => {
    const [holidays, setHolidays] = useState<HolidayState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });
    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const authedFetchApi = useAuthedFetchApi();

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [filters, setFilters] = useState(getDefaultFilters);

    const getAllHolidays = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<HolidayState>(
                    {
                        path: '/v1/holidays/search-holidays',
                        query: {
                            paginated: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                    },
                );

                if (response.ok) {
                    setHolidays(response.data);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                toast.error('An error occurred while retrieving holidays');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllHolidaysFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const cleanedFilters = Object.entries(filters).reduce(
                    (acc, [key, value]) => {
                        if (value && value !== '') {
                            acc[key] = value;
                        }
                        return acc;
                    },
                    {} as Record<string, any>,
                );

                const response = await authedFetchApi<HolidayState>(
                    {
                        path: '/v1/holidays/search-holidays',
                        query: {
                            paginated: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cleanedFilters),
                    },
                );

                if (response.ok) {
                    setHolidays(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                toast.error('An error occurred while retrieving holidays');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, filters],
    );

    const fetchHolidays = useCallback(async () => {
        if (!isFiltered) {
            await getAllHolidays(page, itemPerPage);
        } else {
            await getAllHolidaysFiltered(page, itemPerPage);
        }
    }, [getAllHolidays, getAllHolidaysFiltered, isFiltered, itemPerPage, page]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchHolidays,
    });

    useEffect(() => {
        if (!isFiltered) {
            fetchHolidays();
        }
    }, [fetchHolidays, isFiltered]);

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchHolidays();
        }
    }, [searchVersion, isFiltered, page, fetchHolidays]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
        setSelectedIds(new Set());
    }, []);

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

    const handleSelectAll = (
        currentPageItems: (HolidayWithId & { active?: boolean })[],
    ) => {
        const today = moment.tz('Asia/Dhaka').startOf('day');
        const activeItems = currentPageItems.filter(item => {
            if (!item.active) return false;
            const dateTo = item.dateTo
                ? moment.tz(item.dateTo, 'Asia/Dhaka').startOf('day')
                : moment.tz(item.dateFrom, 'Asia/Dhaka').startOf('day');
            return (
                dateTo.isAfter(today) ||
                moment
                    .tz(item.dateFrom, 'Asia/Dhaka')
                    .startOf('day')
                    .isAfter(today)
            );
        });
        if (selectedIds.size === activeItems.length && activeItems.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(activeItems.map(item => item._id)));
        }
    };

    const createHoliday = async (data: HolidayData) => {
        try {
            const response = await authedFetchApi(
                { path: '/v1/holidays' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (response.ok) {
                toast.success('Holiday added successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while adding holiday');
            return false;
        }
    };

    const editHoliday = async (id: string, data: HolidayData) => {
        try {
            const response = await authedFetchApi(
                { path: `/v1/holidays/${id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (response.ok) {
                toast.success('Holiday updated successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating holiday');
            return false;
        }
    };

    const deleteHoliday = async (id: string) => {
        try {
            const response = await authedFetchApi(
                { path: `/v1/holidays/${id}` },
                { method: 'DELETE' },
            );
            if (response.ok) {
                toast.success('Holiday deleted successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting holiday');
            return false;
        }
    };

    const canEdit = hasPerm('admin:edit_holiday', userPermissions);
    const canCreate = hasPerm('admin:create_holiday', userPermissions);

    const onDeactivateSuccess = () => {
        setSelectedIds(new Set());
        fetchHolidays();
    };

    return (
        <>
            <div className="flex flex-col mb-4 gap-2 sm:flex-row sm:justify-between items-center">
                <div className="flex-none sm:min-w-[150px] w-full sm:w-auto flex justify-center sm:justify-start gap-2">
                    {canCreate && (
                        <CreateButton
                            submitHandler={createHoliday}
                            className="w-full sm:w-auto"
                        />
                    )}
                </div>

                <div className="flex flex-1 justify-center items-center text-xl text-gray-900 font-semibold sm:whitespace-nowrap px-4 text-center">
                    {isFiltered && (filters.fromDate || filters.toDate) && (
                        <span className="flex items-center flex-wrap justify-center">
                            <ClockCheck
                                size={23}
                                className="mr-2 flex-shrink-0"
                            />
                            {filters.fromDate && (
                                <>
                                    <span>{formatDate(filters.fromDate)}</span>
                                    {filters.toDate && (
                                        <span className="mx-1 mt-0.5">–</span>
                                    )}
                                </>
                            )}
                            {filters.toDate && (
                                <span>{formatDate(filters.toDate)}</span>
                            )}
                        </span>
                    )}
                </div>

                <div className="flex flex-none sm:min-w-[150px] w-full sm:w-auto justify-center sm:justify-end items-center gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        isLoading={loading}
                        setPage={setPage}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
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
                        className="w-full sm:w-auto"
                    />
                </div>
            </div>

            <BulkDeactivate
                selectedIds={selectedIds}
                canEdit={canEdit}
                isOpen={isDeactivateModalOpen}
                onOpenChange={setIsDeactivateModalOpen}
                onClearSelection={() => setSelectedIds(new Set())}
                onSuccess={onDeactivateSuccess}
            />

            {loading ? (
                <p className="text-center text-gray-500 mb-4 font-semibold">
                    Loading...
                </p>
            ) : null}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (holidays.items.length > 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    {canEdit && (
                                        <th className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    holidays.items.length > 0 &&
                                                    holidays.items.filter(i => {
                                                        if (!i.active)
                                                            return false;
                                                        const dTo = i.dateTo
                                                            ? moment
                                                                  .tz(
                                                                      i.dateTo,
                                                                      'Asia/Dhaka',
                                                                  )
                                                                  .startOf(
                                                                      'day',
                                                                  )
                                                            : moment
                                                                  .tz(
                                                                      i.dateFrom,
                                                                      'Asia/Dhaka',
                                                                  )
                                                                  .startOf(
                                                                      'day',
                                                                  );
                                                        return (
                                                            dTo.isAfter(
                                                                moment
                                                                    .tz(
                                                                        'Asia/Dhaka',
                                                                    )
                                                                    .startOf(
                                                                        'day',
                                                                    ),
                                                            ) ||
                                                            moment
                                                                .tz(
                                                                    i.dateFrom,
                                                                    'Asia/Dhaka',
                                                                )
                                                                .startOf('day')
                                                                .isAfter(
                                                                    moment
                                                                        .tz(
                                                                            'Asia/Dhaka',
                                                                        )
                                                                        .startOf(
                                                                            'day',
                                                                        ),
                                                                )
                                                        );
                                                    }).length > 0 &&
                                                    selectedIds.size ===
                                                        holidays.items.filter(
                                                            i => {
                                                                if (!i.active)
                                                                    return false;
                                                                const dTo =
                                                                    i.dateTo
                                                                        ? moment
                                                                              .tz(
                                                                                  i.dateTo,
                                                                                  'Asia/Dhaka',
                                                                              )
                                                                              .startOf(
                                                                                  'day',
                                                                              )
                                                                        : moment
                                                                              .tz(
                                                                                  i.dateFrom,
                                                                                  'Asia/Dhaka',
                                                                              )
                                                                              .startOf(
                                                                                  'day',
                                                                              );
                                                                return (
                                                                    dTo.isAfter(
                                                                        moment
                                                                            .tz(
                                                                                'Asia/Dhaka',
                                                                            )
                                                                            .startOf(
                                                                                'day',
                                                                            ),
                                                                    ) ||
                                                                    moment
                                                                        .tz(
                                                                            i.dateFrom,
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
                                                                );
                                                            },
                                                        ).length
                                                }
                                                onChange={() =>
                                                    handleSelectAll(
                                                        holidays.items,
                                                    )
                                                }
                                                className="w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer"
                                            />
                                        </th>
                                    )}
                                    <th className="text-center">S/N</th>
                                    <th>Name</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Active</th>
                                    <th>Comment</th>
                                    {canEdit && (
                                        <th className="text-center">Action</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.items.map((holiday, index) => {
                                    const dateFrom = moment
                                        .tz(holiday.dateFrom, 'Asia/Dhaka')
                                        .startOf('day');
                                    const dateTo = holiday.dateTo
                                        ? moment
                                              .tz(holiday.dateTo, 'Asia/Dhaka')
                                              .startOf('day')
                                        : null;
                                    const today = moment
                                        .tz('Asia/Dhaka')
                                        .startOf('day');

                                    const isFuture = dateFrom.isAfter(today);
                                    const isOngoing =
                                        !isFuture &&
                                        dateTo &&
                                        dateTo.isAfter(today);
                                    const isPast =
                                        !isFuture &&
                                        (!dateTo || !dateTo.isAfter(today));

                                    return (
                                        <tr key={holiday._id}>
                                            {canEdit && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(
                                                            holiday._id,
                                                        )}
                                                        disabled={
                                                            !holiday.active ||
                                                            isPast
                                                        }
                                                        onChange={() =>
                                                            toggleSelectOne(
                                                                holiday._id,
                                                            )
                                                        }
                                                        className="w-5 h-5 text-blue-600 bg-gray-50 border-gray-300 rounded-md cursor-pointer disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            )}
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.name}
                                            </td>
                                            <td
                                                className="text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {formatDate(
                                                    String(holiday.dateFrom),
                                                )}
                                            </td>
                                            <td
                                                className="text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.dateTo
                                                    ? formatDate(
                                                          String(
                                                              holiday.dateTo,
                                                          ),
                                                      )
                                                    : '-'}
                                            </td>
                                            <td
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.active ? 'Yes' : '-'}
                                            </td>
                                            <td
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.comment
                                                    ? String(holiday.comment)
                                                    : '-'}
                                            </td>
                                            {canEdit && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="flex gap-2 justify-center">
                                                        <EditButton
                                                            holiday={holiday}
                                                            submitHandler={
                                                                editHoliday
                                                            }
                                                        />
                                                        {holiday.active && (
                                                            <>
                                                                {isFuture && (
                                                                    <DeleteButton
                                                                        holiday={
                                                                            holiday
                                                                        }
                                                                        submitHandler={
                                                                            deleteHoliday
                                                                        }
                                                                    />
                                                                )}{' '}
                                                                {isOngoing && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedIds(
                                                                                new Set(
                                                                                    [
                                                                                        holiday._id,
                                                                                    ],
                                                                                ),
                                                                            );
                                                                            setIsDeactivateModalOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        title="Deactivate Holiday"
                                                                        className="rounded-md bg-red-600 hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                                    >
                                                                        <Ban
                                                                            size={
                                                                                18
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Holidays Found" type={Type.danger} />
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
