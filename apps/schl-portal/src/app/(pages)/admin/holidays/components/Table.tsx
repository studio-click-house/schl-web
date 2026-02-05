'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import {
    HOLIDAY_TARGET_TYPES,
    HOLIDAY_TYPES,
    type HalfDayPeriod,
    type HolidayTargetType,
    type HolidayType,
    type LeavePaymentType,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { YYYY_MM_DD_to_DD_MM_YY as formatDateDisplay } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CreateButton from './Create';
import DeleteButton from './Delete';
import FilterButton from './Filter';

export interface HolidayDataType {
    _id?: string;
    title: string;
    description: string;
    holiday_type: HolidayType;
    half_day_period: HalfDayPeriod | null;
    payment_type: LeavePaymentType;
    start_date: string;
    end_date: string;
    target_type: HolidayTargetType;
    target_shift: ShiftType | null;
    target_employees: string[];
    is_active: boolean;
}

type HolidaysState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: HolidayDataType[];
};

const Table: React.FC = () => {
    const [holidays, setHolidays] = useState<HolidaysState>({
        pagination: { count: 0, pageCount: 0 },
        items: [],
    });
    const [employees, setEmployees] = useState<EmployeeDocument[]>([]);

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        holidayType: '' as HolidayType | '',
        targetType: '' as HolidayTargetType | '',
    });

    const getAllHolidays = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                setLoading(true);

                const response = await authedFetchApi<HolidayDataType[]>(
                    {
                        path: '/v1/holiday/list',
                    },
                    { method: 'GET' },
                );

                if (response.ok) {
                    const totalCount = response.data.length;
                    const nextPageCount = Math.max(
                        1,
                        Math.ceil(totalCount / itemPerPage),
                    );
                    setHolidays({
                        pagination: {
                            count: totalCount,
                            pageCount: nextPageCount,
                        },
                        items: response.data,
                    });
                    setPageCount(nextPageCount);
                    if (page > nextPageCount) setPage(1);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving holidays data');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllHolidaysFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                setLoading(true);

                const query: Record<string, string | number | boolean> = {
                };
                if (filters.holidayType)
                    query.holidayType = filters.holidayType;
                if (filters.targetType) query.targetType = filters.targetType;

                const response = await authedFetchApi<HolidayDataType[]>(
                    { path: '/v1/holiday/list', query },
                    { method: 'GET' },
                );

                if (response.ok) {
                    const totalCount = response.data.length;
                    const nextPageCount = Math.max(
                        1,
                        Math.ceil(totalCount / itemPerPage),
                    );
                    setHolidays({
                        pagination: {
                            count: totalCount,
                            pageCount: nextPageCount,
                        },
                        items: response.data,
                    });
                    setIsFiltered(true);
                    setPageCount(nextPageCount);
                    if (page > nextPageCount) setPage(1);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving holidays data');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, filters],
    );

    const getAllEmployees = useCallback(async () => {
        try {
            const response = await authedFetchApi<EmployeeDocument[]>(
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
                setEmployees(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
        }
    }, [authedFetchApi]);

    const fetchHolidays = useCallback(async () => {
        if (!isFiltered) {
            await getAllHolidays(page, itemPerPage);
        } else {
            await getAllHolidaysFiltered(page, itemPerPage);
        }
    }, [getAllHolidays, getAllHolidaysFiltered, isFiltered, itemPerPage, page]);

    const deleteHoliday = useCallback(
        async (holidayData: HolidayDataType) => {
            try {
                if (!hasPerm('admin:manage_holidays', userPermissions)) {
                    toast.error("You don't have permission to delete holidays");
                    return;
                }

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/holiday/delete/${holidayData._id}` },
                    { method: 'DELETE' },
                );

                if (response.ok) {
                    toast.success('Deleted the holiday successfully');
                    await fetchHolidays();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while deleting the holiday');
            }
        },
        [authedFetchApi, fetchHolidays, userPermissions],
    );

    const createHoliday = useCallback(
        async (holidayData: HolidayDataType) => {
            try {
                if (!hasPerm('admin:manage_holidays', userPermissions)) {
                    toast.error("You don't have permission to create holidays");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: '/v1/holiday/create' },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(holidayData),
                    },
                );

                if (response.ok) {
                    toast.success('Created new holiday successfully');
                    await fetchHolidays();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while creating the holiday');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, fetchHolidays, userPermissions],
    );

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchHolidays,
    });

    useEffect(() => {
        getAllEmployees();
    }, [getAllEmployees]);

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchHolidays();
        }
    }, [searchVersion, isFiltered, page]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [setIsFiltered, setPage]);

    const getTargetLabel = (holiday: HolidayDataType) => {
        if (holiday.target_type === 'all') return 'All Employees';
        if (holiday.target_type === 'shift')
            return `${holiday.target_shift?.charAt(0).toUpperCase()}${holiday.target_shift?.slice(1)} Shift`;
        if (holiday.target_type === 'individual')
            return `${holiday.target_employees.length} Employee(s)`;
        return '-';
    };

    const formatHolidayType = (type: HolidayType) => {
        return type
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    };

    const paginatedItems = holidays.items.slice(
        (page - 1) * itemPerPage,
        page * itemPerPage,
    );

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:manage_holidays', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:manage_holidays', userPermissions) && (
                    <CreateButton
                        loading={loading}
                        employees={employees}
                        submitHandler={createHoliday}
                    />
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
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (paginatedItems.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Payment</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Target</th>
                                    <th>Status</th>
                                    {hasPerm(
                                        'admin:manage_holidays',
                                        userPermissions,
                                    ) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map((holiday, index) => (
                                    <tr key={String(holiday._id)}>
                                        <td>
                                            {index +
                                                1 +
                                                itemPerPage * (page - 1)}
                                        </td>
                                        <td className="text-wrap">
                                            {holiday.title}
                                        </td>
                                        <td>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs',
                                                    holiday.holiday_type ===
                                                        'full_day' &&
                                                        'bg-green-100 text-green-800',
                                                    holiday.holiday_type ===
                                                        'half_day' &&
                                                        'bg-yellow-100 text-yellow-800',
                                                    holiday.holiday_type ===
                                                        'vacation' &&
                                                        'bg-blue-100 text-blue-800',
                                                )}
                                            >
                                                {formatHolidayType(
                                                    holiday.holiday_type,
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs',
                                                    holiday.payment_type ===
                                                        'paid'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-red-100 text-red-800',
                                                )}
                                            >
                                                {holiday.payment_type
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    holiday.payment_type.slice(
                                                        1,
                                                    )}
                                            </span>
                                        </td>
                                        <td>
                                            {formatDateDisplay(
                                                holiday.start_date,
                                            )}
                                        </td>
                                        <td>
                                            {formatDateDisplay(
                                                holiday.end_date,
                                            )}
                                        </td>
                                        <td>{getTargetLabel(holiday)}</td>
                                        <td>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs',
                                                    holiday.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800',
                                                )}
                                            >
                                                {holiday.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                        {hasPerm(
                                            'admin:manage_holidays',
                                            userPermissions,
                                        ) && (
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        <DeleteButton
                                                            holidayData={
                                                                holiday
                                                            }
                                                            submitHandler={
                                                                deleteHoliday
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="table border table-bordered table-striped">
                            <tbody>
                                <tr key={0}>
                                    <td className="align-center text-center text-wrap">
                                        No Holidays To Show.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
