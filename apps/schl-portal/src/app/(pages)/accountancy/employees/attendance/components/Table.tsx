'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { AttendanceDocument } from '@repo/common/models/attendance.schema';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn, generateAvatar } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Minus, Plus, UserRound, Users } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';

const EmployeeAvatar = ({ employee }: { employee: any }) => {
    const [avatarUri, setAvatarUri] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const fetchAvatar = async () => {
            const uri = await generateAvatar(employee?.real_name || '');
            if (isMounted) setAvatarUri(uri);
        };
        fetchAvatar();

        return () => {
            isMounted = false;
        };
    }, [employee?.real_name]);

    return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
            {avatarUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={avatarUri}
                    alt="avatar"
                    className="w-full h-full object-cover"
                />
            ) : (
                <UserRound size={20} className="text-gray-400" />
            )}
        </div>
    );
};

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import DeleteButton from './Delete';
import FilterButton from './Filter';

interface AttendanceTableProps {
    queryEmployeeId?: string;
}

type AttendanceWithRelations = AttendanceDocument & {
    employee?: EmployeeDocument | string;
    shift_date?: Date;
    flag?: any;
};

type GroupedAttendance = {
    employee: EmployeeDocument | string | any;
    records: AttendanceWithRelations[];
};

type AttendanceResponse = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: GroupedAttendance[];
};

type EmployeeOption = {
    value: string;
    label: string;
};

const getDefaultDateRange = (): { fromDate: string; toDate: string } => {
    const today = moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
    return {
        fromDate: today,
        toDate: today,
    };
};

const Table = ({ queryEmployeeId }: AttendanceTableProps) => {
    const [attendanceData, setAttendanceData] = useState<GroupedAttendance[]>(
        [],
    );
    const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>(
        [],
    );
    const [pageCount, setPageCount] = useState<number>(0);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = useCallback((employeeId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set<string>();
            if (!prev.has(employeeId)) {
                newSet.add(employeeId);
            }
            return newSet;
        });
    }, []);

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const authedFetchApi = useAuthedFetchApi();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(1);
    const [itemPerPage, setItemPerPage] = useState<number>(30);

    const baseDateRange = getDefaultDateRange();

    const initialEmployeeId = queryEmployeeId || '';

    const [filters, setFilters] = useState<{
        employeeId: string;
        fromDate: string;
        toDate: string;
        department: string;
    }>({
        employeeId: initialEmployeeId,
        department: '',
        ...baseDateRange,
    });

    const [appliedFilters, setAppliedFilters] = useState<{
        employeeId: string;
        fromDate: string;
        toDate: string;
        department: string;
    }>({
        employeeId: initialEmployeeId,
        department: '',
        ...baseDateRange,
    });

    const getEmployeesForFilter = useCallback(async () => {
        try {
            const response = await authedFetchApi<EmployeeDocument[]>(
                {
                    path: '/v1/employee/search-employees',
                    query: { paginated: false },
                },
                {
                    method: 'POST',
                    headers: {
                        Accept: '*/*',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'active' }),
                    cache: 'no-store',
                },
            );

            if (response.ok) {
                const options = (response.data || []).map(employee => ({
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

    const getAllAttendance = useCallback(async () => {
        try {
            setLoading(true);

            const effectiveEmployeeId = appliedFilters.employeeId || undefined;

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
                        employeeId: effectiveEmployeeId,
                        fromDate: appliedFilters.fromDate,
                        toDate: appliedFilters.toDate,
                        department: appliedFilters.department || undefined,
                    }),
                    cache: 'no-store',
                },
            );

            if (response.ok) {
                const data = response.data;
                setAttendanceData(data.items || []);
                setPageCount(data.pagination.pageCount || 0);

                if (queryEmployeeId && data.items?.length) {
                    setExpandedRows(new Set([queryEmployeeId]));
                }
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving attendance data');
        } finally {
            setLoading(false);
        }
    }, [
        appliedFilters.employeeId,
        appliedFilters.fromDate,
        appliedFilters.toDate,
        appliedFilters.department,
        authedFetchApi,
        itemPerPage,
        page,
        queryEmployeeId,
    ]);

    useEffect(() => {
        getEmployeesForFilter();
    }, [getEmployeesForFilter]);

    useEffect(() => {
        getAllAttendance();
    }, [getAllAttendance]);

    const handleSearch = useCallback(() => {
        setAppliedFilters(filters);
        setPage(1);

        if (searchParams.has('employeeId')) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('employeeId');
            const queryString = params.toString();
            router.replace(
                `${pathname}${queryString ? `?${queryString}` : ''}`,
            );
        }
    }, [filters, searchParams, pathname, router]);

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

    const getReferenceDate = (attendance: AttendanceWithRelations) =>
        attendance.shift_date || attendance.in_time;

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
        inTime?: Date | null,
        outTime?: Date | null,
        flag?: any,
    ) => {
        if (!inTime || !outTime) return '0:0';
        if (
            flag &&
            (flag.ignore_attendance_hours ||
                ['A', 'W', 'H', 'L'].includes(flag.code))
        )
            return '0:0';
        try {
            const start = moment.tz(inTime, 'Asia/Dhaka');
            const end = moment.tz(outTime, 'Asia/Dhaka');
            const diffMinutes = end.diff(start, 'minutes');
            const hours = Math.floor(Math.max(diffMinutes, 0) / 60);
            const minutes = Math.max(diffMinutes % 60, 0);
            return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
        } catch {
            return '0:0';
        }
    };

    const getDayOfWeek = (date?: Date | null) => {
        if (!date) return '';
        try {
            return moment.tz(date, 'Asia/Dhaka').format('ddd');
        } catch {
            return '';
        }
    };

    const getEmployeeCode = (attendance: AttendanceWithRelations) => {
        if (!attendance.employee || typeof attendance.employee === 'string') {
            return '-';
        }
        return attendance.employee.e_id;
    };

    const getEmployeeName = (attendance: AttendanceWithRelations) => {
        if (!attendance.employee || typeof attendance.employee === 'string') {
            return '-';
        }
        return attendance.employee.real_name;
    };

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    'sm:flex-row sm:justify-between',
                )}
            >
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Link
                        href="/accountancy/employees"
                        className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2 w-full sm:w-auto"
                    >
                        Employees
                        <Users size={18} />
                    </Link>
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
                        onChange={e => {
                            setItemPerPage(parseInt(e.target.value));
                            setPage(1);
                        }}
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
                        employeeOptions={employeeOptions}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="flex flex-col gap-2 mb-8">
                {!loading && attendanceData.length !== 0 ? (
                    attendanceData.map((group, groupIdx) => {
                        const emp =
                            typeof group.employee === 'object'
                                ? group.employee
                                : null;
                        const empId = emp
                            ? String(emp._id)
                            : `unknown-${groupIdx}`;
                        const isExpanded = expandedRows.has(empId);

                        return (
                            <div
                                key={empId}
                                className="border border-gray-200 rounded-md bg-white overflow-hidden"
                            >
                                {/* Employee Header Row */}
                                <div
                                    className="flex items-center justify-between px-4 py-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                    onClick={() => toggleRow(empId)}
                                >
                                    <div className="flex items-center gap-4 w-[250px] sm:w-[300px]">
                                        <EmployeeAvatar employee={emp} />
                                        <div>
                                            <div className="font-semibold text-gray-800 text-base">
                                                {emp?.real_name ||
                                                    'Unknown Employee'}
                                            </div>
                                            <div className="text-gray-500 text-sm mt-0.5">
                                                {emp?.e_id || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 px-4 hidden sm:block">
                                        <div className="text-gray-700 text-base">
                                            {emp?.designation || '-'}
                                        </div>
                                        <div className="text-gray-500 text-sm mt-0.5 text-ellipsis">
                                            {emp?.branch || 'Head Office'}
                                        </div>
                                    </div>
                                    <div className="text-gray-400 p-2 rounded hover:text-gray-700 transition-colors">
                                        {isExpanded ? (
                                            <Minus size={18} />
                                        ) : (
                                            <Plus size={18} />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Attendance Sub-table */}
                                {isExpanded && (
                                    <div className="p-2 sm:p-4 bg-white border-t border-gray-200 overflow-x-auto">
                                        <div className="table-responsive text-nowrap text-base m-0">
                                            <table className="table border table-bordered m-0">
                                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                                    <tr>
                                                        <th>Attendance Date</th>
                                                        <th className="text-center">
                                                            Flag
                                                        </th>
                                                        <th>In Time</th>
                                                        <th>In Time Remarks</th>
                                                        <th>Out Time & Date</th>
                                                        <th>
                                                            Out Time Remarks
                                                        </th>
                                                        <th className="text-center">
                                                            Working Hour
                                                        </th>

                                                        {hasPerm(
                                                            'admin:delete_attendance',
                                                            userPermissions,
                                                        ) && (
                                                            <th className="text-center">
                                                                Action
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.records.map(
                                                        (attendance, index) => {
                                                            const referenceDate =
                                                                getReferenceDate(
                                                                    attendance,
                                                                );
                                                            const isVirtualRow =
                                                                Boolean(
                                                                    (
                                                                        attendance as any
                                                                    )
                                                                        .is_virtual,
                                                                );

                                                            return (
                                                                <tr
                                                                    key={String(
                                                                        attendance._id,
                                                                    )}
                                                                >
                                                                    <td className="text-wrap">
                                                                        <span className="font-medium">
                                                                            {getDayOfWeek(
                                                                                referenceDate,
                                                                            )}
                                                                        </span>
                                                                        ,{' '}
                                                                        {formatAttendanceDate(
                                                                            referenceDate,
                                                                        )}
                                                                    </td>
                                                                    <td
                                                                        className="text-wrap text-center uppercase"
                                                                        style={{
                                                                            verticalAlign:
                                                                                'middle',
                                                                        }}
                                                                    >
                                                                        {(
                                                                            attendance as any
                                                                        )
                                                                            .flag ? (
                                                                            <Badge
                                                                                value={
                                                                                    (
                                                                                        attendance as any
                                                                                    )
                                                                                        .flag
                                                                                        .code
                                                                                }
                                                                                className="border"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        (
                                                                                            attendance as any
                                                                                        )
                                                                                            .flag
                                                                                            .color ||
                                                                                        '#e5e7eb',
                                                                                    color: '#ffffff',
                                                                                    borderColor:
                                                                                        (
                                                                                            attendance as any
                                                                                        )
                                                                                            .flag
                                                                                            .color ||
                                                                                        '#e5e7eb',
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <Badge
                                                                                value={
                                                                                    attendance.status ||
                                                                                    'N/A'
                                                                                }
                                                                                className="bg-gray-100 text-gray-800 border-gray-300"
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="text-wrap font-medium text-gray-700">
                                                                        {formatAttendanceTime(
                                                                            attendance.in_time,
                                                                        )}
                                                                    </td>
                                                                    <td className="text-wrap">
                                                                        <div
                                                                            className="max-w-[200px] truncate text-gray-500"
                                                                            title={
                                                                                attendance.in_remark
                                                                            }
                                                                        >
                                                                            {attendance.in_remark ||
                                                                                '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-wrap font-medium text-gray-700">
                                                                        {attendance.out_time
                                                                            ? `${formatAttendanceDate(attendance.out_time)}, ${formatAttendanceTime(attendance.out_time)}`
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="text-wrap">
                                                                        <div
                                                                            className="max-w-[200px] truncate text-gray-500"
                                                                            title={
                                                                                attendance.out_remark
                                                                            }
                                                                        >
                                                                            {attendance.out_remark ||
                                                                                '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-wrap font-semibold text-gray-800 text-center">
                                                                        {calculateWorkingHours(
                                                                            attendance.in_time,
                                                                            attendance.out_time,
                                                                            (
                                                                                attendance as any
                                                                            )
                                                                                .flag,
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
                                                                            {isVirtualRow ? (
                                                                                <span className="text-gray-400">
                                                                                    -
                                                                                </span>
                                                                            ) : (
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
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        },
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : !loading ? (
                    <NoData
                        text="No Attendance Records Found"
                        type={Type.danger}
                    />
                ) : null}
            </div>

            <style>
                {`
                    th,
                    td {
                        padding: 6px 10px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
