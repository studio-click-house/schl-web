'use client';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { useAuthedFetchApi } from '@/lib/api-client';
import {
    LeaveType,
    leaveTypeOptions,
} from '@repo/common/constants/leave.constant';
import { Check, Edit, Plus, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Filter from './Filter';
import LeaveModal from './LeaveModal';

interface AttendanceFlag {
    _id: string;
    name: string;
    code: string;
    color: string;
}

interface Employee {
    _id: string;
    real_name: string;
}

interface Leave {
    _id: string;
    employee: Employee | string;
    flag: AttendanceFlag | string;
    leave_type?: LeaveType;
    is_paid?: boolean;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

const List: React.FC = () => {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [flags, setFlags] = useState<AttendanceFlag[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const authedFetchApi = useAuthedFetchApi();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState<Leave | null>(null);

    const [filters, setFilters] = useState<{
        employeeId: string;
        fromDate: string;
        toDate: string;
        isPaid: boolean | null;
        leaveType: string;
    }>({
        employeeId: '',
        fromDate: '',
        toDate: '',
        isPaid: null,
        leaveType: '',
    });

    // pagination
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);

    const fetchData = useCallback(
        async (pageArg: number = 1, itemsArg: number = itemPerPage) => {
            setLoading(true);
            try {
                // POST /v1/leaves/search with pagination
                const query = new URLSearchParams({
                    paginated: 'true',
                    page: String(pageArg),
                    itemsPerPage: String(itemsArg),
                });
                const leavesPath = `/v1/leaves/search?${query.toString()}`;

                const [leavesRes, employeesRes, flagsRes] = await Promise.all([
                    authedFetchApi<{
                        items: Leave[];
                        pagination: { count: number; pageCount: number };
                    }>(
                        { path: leavesPath },
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                employeeId: filters.employeeId || undefined,
                                fromDate: filters.fromDate || undefined,
                                toDate: filters.toDate || undefined,
                                isPaid:
                                    typeof filters.isPaid === 'boolean'
                                        ? filters.isPaid
                                        : undefined,
                                leaveType: filters.leaveType || undefined,
                            }),
                        },
                    ),
                    authedFetchApi<Employee[]>(
                        {
                            path: '/v1/employee/search-employees',
                            query: { paginated: false },
                        },
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                        },
                    ),
                    authedFetchApi<AttendanceFlag[]>(
                        { path: '/v1/attendance-flags' },
                        { method: 'GET' },
                    ),
                ]);

                if (leavesRes.ok) {
                    const data = leavesRes.data as any;
                    setLeaves(data.items || []);
                    setPageCount(data.pagination?.pageCount || 0);
                }

                if (employeesRes.ok) setEmployees(employeesRes.data);
                if (flagsRes.ok) setFlags(flagsRes.data);

                if (!leavesRes.ok) toast.error('Failed to fetch leaves');
            } catch (err) {
                console.error(err);
                toast.error('Network error');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, filters, itemPerPage],
    );

    useEffect(() => {
        fetchData(page, itemPerPage);
    }, [fetchData, page, itemPerPage]);

    const handleStatusChange = async (
        id: string,
        status: 'approved' | 'rejected',
    ) => {
        try {
            const response = await authedFetchApi(
                { path: `/v1/leaves/${id}/status` },
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                },
            );

            if (response.ok) {
                toast.success(`Leave ${status}`);
                fetchData(page, itemPerPage); // Refresh list
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Update failed',
                );
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this leave application?')) return;
        try {
            const res = await authedFetchApi(
                { path: `/v1/leaves/${id}` },
                { method: 'DELETE' },
            );
            if (res.ok) {
                toast.success('Deleted');
                fetchData(page, itemPerPage);
            } else {
                toast.error(res.data?.message || 'Delete failed');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    if (loading) {
        return <div className="p-4 text-center">Loading leaves...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 uppercase underline underline-offset-4">
                        Leave Requests
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage employee leave applications.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        isLoading={loading}
                        setPage={setPage}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e =>
                            setItemPerPage(parseInt(e.target.value, 10))
                        }
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <Filter
                        submitHandler={() => {
                            setPage(1);
                            fetchData(1, itemPerPage);
                        }}
                        filters={filters}
                        setFilters={setFilters}
                        isLoading={loading}
                        employees={employees}
                    />

                    <button
                        onClick={() => {
                            setEditingLeave(null);
                            setIsModalOpen(true);
                        }}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={16} /> New Application
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pay Eligibility
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Period
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reason
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {leaves.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-4 text-center text-gray-500"
                                >
                                    No leave requests found.
                                </td>
                            </tr>
                        ) : (
                            leaves.map(leave => {
                                const empName =
                                    typeof leave.employee === 'object'
                                        ? leave.employee.real_name
                                        : 'Unknown';
                                const flag =
                                    typeof leave.flag === 'object'
                                        ? leave.flag
                                        : null;

                                return (
                                    <tr
                                        key={leave._id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {empName}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {leave.leave_type
                                                ? (leaveTypeOptions.find(
                                                      o =>
                                                          o.value ===
                                                          leave.leave_type,
                                                  )?.label ??
                                                  leave.leave_type
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                      leave.leave_type.slice(1))
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {leave.is_paid ? (
                                                <span className="text-green-600 font-semibold">
                                                    Paid
                                                </span>
                                            ) : (
                                                <span className="text-red-600 font-semibold">
                                                    Unpaid
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(leave.start_date)} -{' '}
                                            {formatDate(leave.end_date)}
                                        </td>
                                        <td
                                            className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate"
                                            title={leave.reason}
                                        >
                                            {leave.reason}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : leave.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                                            >
                                                {leave.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    leave.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {leave.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingLeave(
                                                                    leave,
                                                                );
                                                                setIsModalOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1 rounded"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    leave._id,
                                                                    'approved',
                                                                )
                                                            }
                                                            className="text-green-600 hover:text-green-900 bg-green-50 p-1 rounded"
                                                            title="Approve"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    leave._id,
                                                                    'rejected',
                                                                )
                                                            }
                                                            className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded"
                                                            title="Reject"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() =>
                                                        handleDelete(leave._id)
                                                    }
                                                    className="text-gray-600 hover:text-gray-900 bg-gray-50 p-1 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <LeaveModal
                isOpen={isModalOpen}
                initialData={editingLeave || undefined}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingLeave(null);
                }}
                onSuccess={() => fetchData(page, itemPerPage)}
                flags={flags}
                employees={employees}
            />
        </div>
    );
};

export default List;
