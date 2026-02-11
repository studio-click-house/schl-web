'use client';
import Badge from '@/components/Badge';
import { useAuthedFetchApi } from '@/lib/api-client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HolidayData } from '../schema';
import FilterButton from './Filter';
import HolidayModal from './HolidayModal';

interface Holiday extends HolidayData {
    _id: string;
    flag?:
        | {
              // Populated if backend returns populated
              name: string;
              color: string;
              code: string;
          }
        | string;
}

interface AttendanceFlag {
    _id: string;
    name: string;
    code: string;
    color: string;
}

const List: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [flags, setFlags] = useState<AttendanceFlag[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const authedFetchApi = useAuthedFetchApi();

    const currentYear = new Date().getFullYear();
    const defaultFrom = `${currentYear}-01-01`;
    const defaultTo = `${currentYear}-12-31`;

    const [filters, setFilters] = useState<{ name: string; fromDate: string; toDate: string }>({
        name: '',
        fromDate: defaultFrom,
        toDate: defaultTo,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Build holiday query path using filters
            const params = new URLSearchParams();
            if (filters.fromDate) params.append('fromDate', filters.fromDate);
            if (filters.toDate) params.append('toDate', filters.toDate);
            if (filters.name) params.append('name', filters.name);
            const path = `/v1/holidays${params.toString() ? `?${params.toString()}` : ''}`;

            // Fetch Holidays
            const holidaysRes = await authedFetchApi<Holiday[]>(
                { path, },
                { method: 'GET' },
            );

            // Fetch Flags for the dropdown and local lookup
            const flagsRes = await authedFetchApi<AttendanceFlag[]>(
                { path: '/v1/attendance-flags' },
                { method: 'GET' },
            );

            if (holidaysRes.ok && flagsRes.ok) {
                setHolidays(holidaysRes.data);
                setFlags(flagsRes.data);
            } else {
                toast.error('Failed to fetch data');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setEditingHoliday(null);
        setIsModalOpen(true);
    };

    const handleEdit = (holiday: Holiday) => {
        setEditingHoliday(holiday);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            const response = await authedFetchApi(
                { path: `/v1/holidays/${id}` },
                { method: 'DELETE' },
            );
            if (response.ok) {
                toast.success('Holiday deleted');
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

    const getFlagDetails = (
        flagId:
            | string
            | undefined
            | { name: string; color: string; code: string },
    ) => {
        if (!flagId) return null;
        if (typeof flagId === 'object') return flagId; // Already populated
        return flags.find(f => f._id === flagId);
    };

    if (loading)
        return <div className="p-4 text-center">Loading holidays...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 uppercase underline underline-offset-4">
                        Holidays
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage public holidays and special dates.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <FilterButton
                        submitHandler={() => fetchData()}
                        filters={filters}
                        setFilters={setFilters}
                        isLoading={loading}
                        className=""
                    />

                    <button
                        onClick={handleCreate}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 ml-2"
                    >
                        <Plus size={16} /> Add Holiday
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Comment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type (Flag)
                            </th>

                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {holidays.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-6 py-4 text-center text-gray-500"
                                >
                                    No holidays found.
                                </td>
                            </tr>
                        ) : (
                            holidays.map(holiday => {
                                const flag = getFlagDetails(
                                    (holiday as any).flag || undefined,
                                );
                                const fromDate = new Date((holiday as any).dateFrom || holiday.dateFrom);
                                const toDate = new Date((holiday as any).dateTo || holiday.dateTo);
                                const sameDay = fromDate.toDateString() === toDate.toDateString();

                                return (
                                    <tr
                                        key={holiday._id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {holiday.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sameDay
                                                ? fromDate.toLocaleDateString()
                                                : `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(holiday as any).comment ? (holiday as any).comment : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {flag ? (
                                                <Badge
                                                    value={`${flag.name} (${flag.code})`}
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

                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        handleEdit(holiday)
                                                    }
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            holiday._id,
                                                        )
                                                    }
                                                    className="text-red-600 hover:text-red-900"
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

            <HolidayModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
                editData={editingHoliday}
            />
        </div>
    );
};

export default List;
