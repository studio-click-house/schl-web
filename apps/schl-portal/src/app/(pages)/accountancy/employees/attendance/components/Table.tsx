'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { AttendanceDocument } from '@repo/common/models/attendance.schema';
import { formatDate, formatTime } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus, Undo2 } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatOT } from '../utils/ot-helpers';
import DeleteButton from './Delete';
import FilterButton from './Filter';

interface AttendanceTableProps {
    employeeId: string;
}

type AttendanceResponse = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: AttendanceDocument[];
};

const Table = ({ employeeId }: AttendanceTableProps) => {
    const [attendanceData, setAttendanceData] = useState<AttendanceDocument[]>(
        [],
    );
    const [pageCount, setPageCount] = useState<number>(0);
    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const router = useRouter();
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

    const deleteAttendance = useCallback(
        async (attendance: AttendanceDocument) => {
            try {
                const response = await authedFetchApi<{ message: string }>(
                    {
                        path: `/v1/attendance/delete-attendance/${attendance._id}`,
                    },
                    {
                        method: 'DELETE',
                    },
                );

                if (response.ok) {
                    toast.success('Deleted attendance record successfully');
                    await getAllAttendance();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while deleting attendance');
            }
        },
        [authedFetchApi, getAllAttendance],
    );

    const formatAttendanceTime = (date?: Date | null) => {
        if (!date) return '-';
        try {
            return moment.tz(date, 'Asia/Dhaka').format('hh:mm A');
        } catch {
            return '-';
        }
    };

    const formatAttendanceDate = (date?: Date | null) => {
        if (!date) return '-';
        try {
            return moment.tz(date, 'Asia/Dhaka').format('Do MMM. YYYY');
        } catch {
            return '-';
        }
    };

    const calculateWorkingHours = (
        inTime: Date,
        outTime: Date | null,
        flag?: any,
    ) => {
        if (!inTime || !outTime) return '0:0';
        // If flag says ignore hours, return 0:0
        if (flag && flag.ignore_attendance_hours) return '0:0';
        try {
            const start = moment.tz(inTime, 'Asia/Dhaka');
            const end = moment.tz(outTime, 'Asia/Dhaka');
            const diffMinutes = end.diff(start, 'minutes');
            const hours = Math.floor(diffMinutes / 60);
            const minutes = Math.max(diffMinutes % 60, 0);
            return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
        } catch {
            return '0:0';
        }
    };

    const getDayOfWeek = (date: Date) => {
        if (!date) return '';
        try {
            return moment.tz(date, 'Asia/Dhaka').format('ddd');
        } catch {
            return '';
        }
    };

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_task', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                <div className="flex flex-col sm:flex-row items- sm:items-center gap-2">
                    <Link
                        href="/accountancy/employees"
                        className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Show all employees
                        <Undo2 size={18} />
                    </Link>

                    {hasPerm('admin:create_attendance', userPermissions) && (
                        <button
                            onClick={() =>
                                router.push(
                                    process.env.NEXT_PUBLIC_BASE_URL +
                                        '/accountancy/employees/attendance/add-attendance?employeeId=' +
                                        encodeURIComponent(employeeId),
                                )
                            }
                            className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                        >
                            Add attendance
                            <CirclePlus size={18} />
                        </button>
                    )}
                </div>

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
                                        <th>Flag</th>
                                        <th>In Time</th>
                                        <th>In Remarks</th>
                                        <th>Out Time</th>
                                        <th>Out Remarks</th>
                                        <th>Hours</th>
                                        <th>OT</th>
                                        {hasPerm(
                                            'admin:delete_attendance',
                                            userPermissions,
                                        ) && <th>Action</th>}
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
                                                    {formatAttendanceDate(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {getDayOfWeek(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap uppercase">
                                                    {(attendance as any)
                                                        .flag ? (
                                                        <Badge
                                                            value={
                                                                (
                                                                    attendance as any
                                                                ).flag.code
                                                            }
                                                            className="border"
                                                            style={{
                                                                backgroundColor:
                                                                    (
                                                                        attendance as any
                                                                    ).flag
                                                                        .color ||
                                                                    '#e5e7eb',
                                                                color: '#ffffff',
                                                                borderColor:
                                                                    (
                                                                        attendance as any
                                                                    ).flag
                                                                        .color ||
                                                                    '#e5e7eb',
                                                            }}
                                                        />
                                                    ) : (
                                                        // Fallback to Status if no flag
                                                        <Badge
                                                            value={
                                                                attendance.status ||
                                                                'N/A'
                                                            }
                                                            className="bg-gray-100 text-gray-800 border-gray-400"
                                                        />
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {formatAttendanceTime(
                                                        attendance.in_time,
                                                    )}
                                                </td>
                                                <td className="text-wrap">
                                                    {attendance.in_remark ||
                                                        '-'}
                                                </td>
                                                <td className="text-wrap">
                                                    {attendance.out_time
                                                        ? `${formatAttendanceDate(
                                                              attendance.out_time,
                                                          )}, ${formatAttendanceTime(
                                                              attendance.out_time,
                                                          )}`
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
                                                        (attendance as any)
                                                            .flag,
                                                    )}
                                                </td>
                                                <td className="text-wrap font-semibold text-green-600">
                                                    {formatOT(
                                                        attendance.ot_minutes,
                                                    )}
                                                </td>
                                                {hasPerm(
                                                    'admin:delete_attendance',
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
                                                            <DeleteButton
                                                                attendanceData={
                                                                    attendance
                                                                }
                                                                submitHandler={
                                                                    deleteAttendance
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
