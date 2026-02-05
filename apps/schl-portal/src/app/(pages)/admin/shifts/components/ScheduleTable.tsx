'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { type ShiftType } from '@repo/common/constants/shift.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AssignButton from './Assign';
import DeleteScheduleButton from './DeleteSchedule';
import EditScheduleButton from './EditSchedule';
import FilterButton from './Filter';

export interface ShiftDataType {
    _id?: string;
    type: ShiftType;
    name: string;
    start_time: string;
    end_time: string;
    grace_minutes: number;
    crosses_midnight: boolean;
    is_active: boolean;
}

interface ShiftSchedule {
    _id: string;
    employee: {
        _id: string;
        e_id: string;
        real_name: string;
        designation: string;
        department: string;
    };
    shift: ShiftDataType;
    shift_type: ShiftType;
    start_date: string;
    end_date: string;
    notes: string;
}

type SchedulesState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftSchedule[];
};

const ScheduleTable: React.FC = () => {
    const [shifts, setShifts] = useState<ShiftDataType[]>([]);
    const [schedules, setSchedules] = useState<SchedulesState>({
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

    const [filters, setFilters] = useState(() => {
        const now = new Date();
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - now.getDay());
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        return {
            shiftType: '' as ShiftType | '',
            dateRange: { startDate: sunday, endDate: saturday },
        };
    });

    const getAllShifts = useCallback(async () => {
        try {
            const response = await authedFetchApi<ShiftDataType[]>(
                { path: '/v1/shift/list' },
                { method: 'GET' },
            );

            if (response.ok) {
                setShifts(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
        }
    }, [authedFetchApi]);

    const getSchedules = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                setLoading(true);
                const query: Record<string, string | number | boolean> = {
                    paginated: true,
                    page,
                    itemsPerPage: itemPerPage,
                };
                if (filters.dateRange.startDate) {
                    query.fromDate = filters.dateRange.startDate.toISOString();
                }
                if (filters.dateRange.endDate) {
                    query.toDate = filters.dateRange.endDate.toISOString();
                }
                if (filters.shiftType) {
                    query.shiftType = filters.shiftType;
                }

                const response = await authedFetchApi<SchedulesState>(
                    {
                        path: '/v1/shift/schedule/list',
                        query,
                    },
                    { method: 'GET' },
                );

                if (response.ok) {
                    setSchedules(response.data);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving schedules');
            } finally {
                setLoading(false);
            }
        },
        [
            authedFetchApi,
            filters.dateRange.startDate,
            filters.dateRange.endDate,
            filters.shiftType,
        ],
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

    const fetchData = useCallback(async () => {
        await getSchedules(page, itemPerPage);
    }, [getSchedules, page, itemPerPage]);

    // Load shifts and employees once on mount
    useEffect(() => {
        getAllShifts();
        getAllEmployees();
    }, [getAllShifts, getAllEmployees]);

    const assignShifts = useCallback(
        async (
            employeeIds: string[],
            shiftId: string,
            shiftType: ShiftType,
            startDate: string,
            endDate: string,
        ) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to assign shifts");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: '/v1/shift/schedule/bulk-assign' },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeIds,
                            shiftId,
                            shiftType,
                            startDate,
                            endDate,
                        }),
                    },
                );

                if (response.ok) {
                    toast.success('Shifts assigned successfully');
                    await getSchedules(page, itemPerPage);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while assigning shifts');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getSchedules, userPermissions, page, itemPerPage],
    );

    const updateSchedule = useCallback(
        async (
            employeeId: string,
            shiftId: string,
            shiftType: ShiftType,
            startDate: string,
            endDate: string,
            notes?: string,
        ) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to update shifts");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: '/v1/shift/schedule/assign' },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId,
                            shiftId,
                            shiftType,
                            startDate,
                            endDate,
                            notes,
                        }),
                    },
                );

                if (response.ok) {
                    toast.success('Shift updated successfully');
                    await getSchedules(page, itemPerPage);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while updating shift');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getSchedules, userPermissions, page, itemPerPage],
    );

    const deleteSchedule = useCallback(
        async (scheduleId: string) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to delete shifts");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/shift/schedule/delete/${scheduleId}` },
                    { method: 'DELETE' },
                );

                if (response.ok) {
                    toast.success('Shift assignment deleted successfully');
                    await getSchedules(page, itemPerPage);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while deleting shift');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getSchedules, userPermissions, page, itemPerPage],
    );

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchData,
    });

    useEffect(() => {
        getSchedules(page, itemPerPage);
    }, [
        filters.dateRange.startDate,
        filters.dateRange.endDate,
        filters.shiftType,
    ]);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:manage_shifts', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                <h2 className="text-xl font-semibold uppercase underline underline-offset-4">
                    Shift Schedules
                </h2>
                <div className="items-center flex gap-2 flex-wrap">
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
                        setFilters={setFilters}
                        filters={filters}
                    />

                    {hasPerm('admin:manage_shifts', userPermissions) && (
                        <AssignButton
                            loading={loading}
                            shifts={shifts}
                            employees={employees}
                            dateRange={filters.dateRange}
                            submitHandler={assignShifts}
                        />
                    )}
                </div>
            </div>

            {loading ? (
                <p className="text-center">Loading...</p>
            ) : (
                <div className="table-responsive text-nowrap text-base">
                    {schedules?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Period</th>
                                    <th>Shift</th>
                                    <th>Time</th>
                                    <th>Notes</th>
                                    {hasPerm(
                                        'admin:manage_shifts',
                                        userPermissions,
                                    ) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {schedules?.items?.map((schedule, index) => (
                                    <tr key={String(schedule._id)}>
                                        <td>
                                            {index +
                                                1 +
                                                itemPerPage * (page - 1)}
                                        </td>
                                        <td>{schedule.employee?.e_id}</td>
                                        <td>{schedule.employee?.real_name}</td>
                                        <td>{schedule.employee?.department}</td>
                                        <td>
                                            {new Date(
                                                schedule.start_date,
                                            ).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}{' '}
                                            -{' '}
                                            {new Date(
                                                schedule.end_date,
                                            ).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                        <td className="capitalize">
                                            {schedule.shift_type}
                                        </td>
                                        <td>
                                            {schedule.shift?.start_time} -{' '}
                                            {schedule.shift?.end_time}
                                        </td>
                                        <td>{schedule.notes || '-'}</td>
                                        {hasPerm(
                                            'admin:manage_shifts',
                                            userPermissions,
                                        ) && (
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <EditScheduleButton
                                                        loading={loading}
                                                        schedule={schedule}
                                                        shifts={shifts}
                                                        submitHandler={
                                                            updateSchedule
                                                        }
                                                    />
                                                    <DeleteScheduleButton
                                                        loading={loading}
                                                        schedule={schedule}
                                                        submitHandler={
                                                            deleteSchedule
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData
                            text="No schedules found for this date range"
                            type={Type.info}
                        />
                    )}
                </div>
            )}

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

export default ScheduleTable;
