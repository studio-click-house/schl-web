'use client';

import Pagination from '@/components/Pagination';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { cn } from '@repo/common/utils/general-utils';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Override {
    _id: string;
    employee: {
        _id: string;
        real_name: string;
    };
    shift_date: string;
    override_type: 'replace' | 'off_day';
    shift_type?: string;
    shift_start?: string;
    shift_end?: string;
    change_reason?: string;
}

interface OverrideResponse {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: Override[];
}

const Table: React.FC = () => {
    const [data, setData] = useState<OverrideResponse>({
        pagination: { count: 0, pageCount: 0 },
        items: [],
    });

    const authedFetchApi = useAuthedFetchApi();
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const itemPerPage = 10;

    const [filters, setFilters] = useState({
        employeeId: '',
        fromDate: '',
        toDate: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
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

            const response = await authedFetchApi<OverrideResponse>(
                {
                    path: '/v1/shift-plan/overrides/search',
                    query: { page, itemsPerPage: itemPerPage, paginated: true },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanedFilters),
                },
            );

            if (response.ok) {
                setData(response.data);
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to fetch overrides',
                );
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, page, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (id: string) => {
        if (
            !confirm(
                'Are you sure you want to delete this override? The original Shift Plan (if any) will take effect.',
            )
        )
            return;
        try {
            const response = await authedFetchApi(
                { path: `/v1/shift-plan/overrides/${id}` },
                { method: 'DELETE' },
            );
            if (response.ok) {
                toast.success('Override deleted');
                fetchData();
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to delete',
                );
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to page 1 on filter change
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-lg">
                <input
                    type="text"
                    name="employeeId" // Ideally this is a Combobox, keeping simple for now
                    placeholder="Search by Employee ID (MongoID currently)"
                    value={filters.employeeId}
                    onChange={handleFilterChange}
                    className="p-2 border rounded text-sm w-full sm:w-64"
                />
                <input
                    type="date"
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={handleFilterChange}
                    className="p-2 border rounded text-sm"
                />
                <input
                    type="date"
                    name="toDate"
                    value={filters.toDate}
                    onChange={handleFilterChange}
                    className="p-2 border rounded text-sm"
                />
                <button
                    onClick={() => fetchData()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                    Filter
                </button>
            </div>

            <div className="flex justify-end">
                <Link
                    href="/admin/shift-plans/overrides/create"
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> Add Override
                </Link>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reason
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-4 text-center"
                                >
                                    Loading...
                                </td>
                            </tr>
                        ) : data.items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-4 text-center text-gray-500"
                                >
                                    No overrides found.
                                </td>
                            </tr>
                        ) : (
                            data.items.map(item => (
                                <tr key={item._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.employee?.real_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(
                                            item.shift_date,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span
                                            className={cn(
                                                'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                                                item.override_type === 'replace'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-red-100 text-red-800',
                                            )}
                                        >
                                            {item.override_type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.override_type === 'replace' ? (
                                            <div>
                                                <span className="font-medium">
                                                    {item.shift_type}
                                                </span>
                                                : {item.shift_start} -{' '}
                                                {item.shift_end}
                                            </div>
                                        ) : (
                                            <span>OFF DAY</span>
                                        )}
                                    </td>
                                    <td
                                        className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate"
                                        title={item.change_reason}
                                    >
                                        {item.change_reason || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() =>
                                                handleDelete(item._id)
                                            }
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete Override"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                page={page}
                pageCount={data.pagination.pageCount}
                setPage={setPage}
                isLoading={loading}
            />
        </div>
    );
};

export default Table;
