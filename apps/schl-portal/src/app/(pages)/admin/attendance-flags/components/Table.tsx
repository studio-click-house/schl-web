'use client';
import { useAuthedFetchApi } from '@/lib/api-client';
import { cn } from '@repo/common/utils/general-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AttendanceFlagData } from '../schema';

interface AttendanceFlag extends AttendanceFlagData {
    _id: string;
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



    if (loading) return <div className="p-4 text-center">Loading flags...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Attendance Flags</h2>

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
                            <th className="px-4 py-3 font-semibold">Color Code</th>
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
                                    <div className="inline-block w-14 h-6 rounded-full border shadow-sm align-middle mr-2" style={{ backgroundColor: flag.color }} />
                                </td>
                            </tr>
                        ))}
                        {flags.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    No flags found. Ask an administrator to add the system flags.
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
