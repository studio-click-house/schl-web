'use client';
import Badge from '@/components/Badge';
import { useAuthedFetchApi } from '@/lib/api-client';
import { Check, Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [leavesRes, employeesRes, flagsRes] = await Promise.all([
                authedFetchApi<Leave[]>(
                    { path: '/v1/leaves' },
                    { method: 'GET' },
                ),
                authedFetchApi<Employee[]>(
                    { path: '/v1/employees' },
                    { method: 'GET' },
                ),
                authedFetchApi<AttendanceFlag[]>(
                    { path: '/v1/attendance-flags' },
                    { method: 'GET' },
                ),
            ]);

            if (leavesRes.ok) setLeaves(leavesRes.data);
            if (employeesRes.ok) setEmployees(employeesRes.data);
            if (flagsRes.ok) setFlags(flagsRes.data);

            if (!leavesRes.ok) toast.error('Failed to fetch leaves');
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                fetchData(); // Refresh list
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

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    if (loading)
        return <div className="p-4 text-center">Loading leaves...</div>;

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
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> New Application
                </button>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
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
                                    colSpan={6}
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
                                            {flag ? (
                                                <Badge
                                                    value={flag.name}
                                                    style={{
                                                        backgroundColor:
                                                            flag.color ||
                                                            '#ccc',
                                                        color: '#fff',
                                                        borderColor:
                                                            flag.color ||
                                                            '#ccc',
                                                    }}
                                                />
                                            ) : (
                                                '-'
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
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${
                                                    leave.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : leave.status ===
                                                            'rejected'
                                                          ? 'bg-red-100 text-red-800'
                                                          : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                                                {leave.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    leave.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {leave.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
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
                                                </div>
                                            )}
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
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
                flags={flags}
                employees={employees}
            />
        </div>
    );
};

export default List;
