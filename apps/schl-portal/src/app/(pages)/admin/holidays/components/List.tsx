'use client';
import Badge from '@/components/Badge';
import { useAuthedFetchApi } from '@/lib/api-client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HolidayData } from '../schema';
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Holidays
            const holidaysRes = await authedFetchApi<Holiday[]>(
                { path: '/v1/holidays' },
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
    }, [authedFetchApi]);

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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 uppercase underline underline-offset-4">
                        Holidays
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage public holidays and special dates.
                    </p>
                </div>

                <button
                    onClick={handleCreate}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> Add Holiday
                </button>
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
                                Type (Flag)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Recurring
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
                                    holiday.flagId || (holiday as any).flag,
                                );
                                return (
                                    <tr
                                        key={holiday._id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {holiday.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(
                                                holiday.date,
                                            ).toLocaleDateString()}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {holiday.recurring ? 'Yes' : 'No'}
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
                flags={flags}
            />
        </div>
    );
};

export default List;
