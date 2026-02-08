'use client';
import { useAuthedFetchApi } from '@/lib/api-client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DepartmentData } from '../schema';
import DepartmentModal from './DepartmentModal';

interface Department extends DepartmentData {
    _id: string;
}

const WEEK_DAYS_MAP: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
};

const Table: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const authedFetchApi = useAuthedFetchApi();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authedFetchApi<Department[]>(
                { path: '/departments' },
                { method: 'GET' },
            );
            if (response.ok) {
                setDepartments(response.data);
            } else {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to fetch departments',
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
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreate = () => {
        setEditingDept(null);
        setIsModalOpen(true);
    };

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department?'))
            return;
        try {
            const response = await authedFetchApi(
                { path: `/departments/${id}` },
                { method: 'DELETE' },
            );
            if (response.ok) {
                toast.success('Department deleted');
                fetchDepartments();
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

    if (loading)
        return <div className="p-4 text-center">Loading departments...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Departments</h2>
                <button
                    onClick={handleCreate}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> Add Department
                </button>
            </div>

            <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">
                                Weekend Days
                            </th>
                            <th className="px-4 py-3 font-semibold">
                                Description
                            </th>
                            <th className="px-4 py-3 font-semibold text-right">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {departments.map(dept => (
                            <tr key={dept._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-bold">
                                    {dept.name}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1 flex-wrap">
                                        {dept.weekend_days.sort().map(d => (
                                            <span
                                                key={d}
                                                className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs"
                                            >
                                                {WEEK_DAYS_MAP[d]}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                    {dept.description}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(dept)}
                                            className="p-1 hover:bg-gray-200 rounded text-blue-600"
                                            title="Edit"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(dept._id)
                                            }
                                            className="p-1 hover:bg-gray-200 rounded text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {departments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    No departments found. Add one to configure
                                    weekends.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <DepartmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchDepartments}
                editData={editingDept}
            />
        </div>
    );
};

export default Table;
