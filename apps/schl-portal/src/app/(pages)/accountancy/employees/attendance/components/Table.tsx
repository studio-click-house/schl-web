'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { Attendance } from '@repo/common/models/attendance.schema';
import { formatDate, formatTime } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { CirclePlus, Undo2 } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import FilterButton from './Filter';

interface AttendanceTableProps {
    employeeId: string;
}

type AttendanceResponse = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: Attendance[];
};

const Table = ({ employeeId }: AttendanceTableProps) => {
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [pageCount, setPageCount] = useState<number>(0);

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(1);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    // Initialize filters with default 1 week range (using Asia/Dhaka timezone)
    const getDefaultDateRange = (): { fromDate: string; toDate: string } => {
        const today = moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
        const oneWeekAgo = moment
            .tz('Asia/Dhaka')
            .subtract(7, 'days')
            .format('YYYY-MM-DD');
        return {
            fromDate: oneWeekAgo,
            toDate: today,
        };
    };

    const [filters, setFilters] = useState<{
        fromDate: string;
        toDate: string;
    }>(getDefaultDateRange());

    const getAllAttendance = useCallback(async () => {
        try {
            setLoading(true);

            const response = await authedFetchApi<AttendanceResponse>(
                {
                    path: '/v1/attendance/search-attendance',
                    query: {
                        page,
                        itemsPerPage: itemPerPage,
                        paginated: true,
                    },
                },
                {
                    method: 'POST',
                    headers: {
                        Accept: '*/*',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        employeeId: employeeId,
                        ...filters,
                    }),
                    cache: 'no-store',
                },
            );

            if (response.ok) {
                const data = response.data;
                setAttendanceData(data.items || []);
                setPageCount(data.pagination.pageCount || 0);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving attendance data');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, employeeId, page, itemPerPage, filters]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: getAllAttendance,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            getAllAttendance();
        }
    }, [searchVersion, page]);

    const handleSearch = useCallback(() => {
        setPage(prev => {
            if (prev === 1) {
                setSearchVersion(v => v + 1);
                return prev;
            }
            return 1;
        });
    }, [setPage]);

    const getFormattedTime = (date: Date) => {
        if (!date) return '-';
        try {
            return formatTime(date);
        } catch {
            return '-';
        }
    };

    const calculateWorkingHours = (inTime: Date, outTime: Date | null) => {
        if (!inTime || !outTime) return '0:0';
        try {
            const in_date = new Date(inTime);
            const out_date = new Date(outTime);
            const diff = out_date.getTime() - in_date.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
        } catch {
            return '0:0';
        }
    };

    const getDayOfWeek = (date: Date) => {
        if (!date) return '';
        try {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayIndex = moment.tz(date, 'Asia/Dhaka').day();
            return days[dayIndex];
        } catch {
            return '';
        }
    };

    return (
        <>
            {/* Pagination Controls - Top */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Link
                        href="/accountancy/employees"
                        className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Show all employees
                        <Undo2 size={18} />
                    </Link>
                    <Link
                        href={`/accountancy/employees/attendance/create-attendance?employeeId=${encodeURIComponent(employeeId)}`}
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Add attendance
                        <CirclePlus size={18} />
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={10}>10</option>
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
                    (attendanceData?.length !== 0 ? (
                        <>
                            <table className="table border table-bordered table-striped">
                                <thead className="table-dark">
                                    <tr>
                                        <th>S/N</th>
                                        <th>Date</th>
                                        <th>Day</th>
                                        <th>Status</th>
                                        <th>In Time</th>
                                        <th>In Remarks</th>
                                        <th>Out Time</th>
                                        <th>Out Remarks</th>
                                        <th>Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceData?.map(
                                        (attendance, index) => (
                                            <tr
                                                key={String(
                                                    attendance.createdAt,
                                                )}
                                            >
                                                <td>
                                                    {(page - 1) * itemPerPage +
                                                        index +
                                                        1}
                                                </td>
                                                <td className="text-wrap">
                                                    {formatDate(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {getDayOfWeek(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap uppercase">
                                                    <Badge
                                                        value={
                                                            attendance.status ||
                                                            'N/A'
                                                        }
                                                        className="bg-blue-100 text-blue-800 border-blue-400"
                                                    />
                                                </td>
                                                <td className="text-wrap">
                                                    {getFormattedTime(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {attendance.in_remark ||
                                                        '-'}
                                                </td>
                                                <td className="text-wrap">
                                                    {attendance.out_time
                                                        ? formatDate(
                                                              attendance.out_time,
                                                          ) +
                                                          ', ' +
                                                          getFormattedTime(
                                                              attendance.out_time,
                                                          )
                                                        : '-'}
                                                </td>
                                                <td className="text-wrap">
                                                    {attendance.out_remark ||
                                                        '-'}
                                                </td>
                                                <td className="text-wrap">
                                                    {calculateWorkingHours(
                                                        attendance.in_time,
                                                        attendance.out_time,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <NoData
                            text="No Attendance Records Found"
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
