'use client';
import { useAuthedFetchApi } from '@/lib/api-client';
import { cn } from '@repo/common/utils/general-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AttendanceFlagData } from '../schema';

interface AttendanceFlag extends AttendanceFlagData {
    _id: string;
    type: 'system' | 'user';
}

const Table: React.FC = () => {
    const [flags, setFlags] = useState<AttendanceFlag[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const authedFetchApi = useAuthedFetchApi();

    const fetchFlags = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authedFetchApi<AttendanceFlag[]>(
                { path: '/v1/attendance-flags' },
                { method: 'GET' },
            );
            if (response.ok) {
                setFlags(response.data);
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to fetch flags',
                );
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi]);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    const handleSeed = async () => {
        setLoading(true);
        try {
            const response = await authedFetchApi(
                { path: '/v1/attendance-flags/seed' },
                { method: 'POST' },
            );
            if (response.ok) {
                toast.success('System flags seeded successfully');
                fetchFlags();
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to seed flags',
                );
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Loading flags...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Attendance Flags</h2>
                {flags.length === 0 && (
                    <button
                        onClick={handleSeed}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Seed Defaults
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Code</th>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">
                                Description
                            </th>
                            <th className="px-4 py-3 font-semibold">Color</th>
                            <th className="px-4 py-3 font-semibold">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {flags.map(flag => (
                            <tr key={flag._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold">
                                    {flag.code}
                                </td>
                                <td className="px-4 py-3">{flag.name}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                    {flag.description}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="inline-block w-6 h-6 rounded-full border shadow-sm align-middle mr-2"
                                        style={{ backgroundColor: flag.color }}
                                    ></span>
                                    {flag.color}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={cn(
                                            'px-2 py-1 rounded-full text-xs font-medium',
                                            flag.type === 'system'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-green-100 text-green-800',
                                        )}
                                    >
                                        {flag.type}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {flags.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    No flags found. Ask an administrator to seed
                                    the system flags.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;
