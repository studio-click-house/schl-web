'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import { WEEK_DAYS, type WeekDay } from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface DepartmentConfigData {
    _id?: string;
    department: EmployeeDepartment;
    weekend_days: WeekDay[];
    is_default: boolean;
}

const WEEK_DAY_LABELS: Record<WeekDay, string> = {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
};

const DepartmentConfigTable: React.FC = () => {
    const [configs, setConfigs] = useState<DepartmentConfigData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [editingDepartment, setEditingDepartment] = useState<string | null>(
        null,
    );
    const [editingWeekends, setEditingWeekends] = useState<WeekDay[]>([]);

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const canManage = useMemo(
        () => hasPerm('admin:manage_shifts', userPermissions),
        [userPermissions],
    );

    const getAllConfigs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await authedFetchApi<DepartmentConfigData[]>(
                { path: '/v1/department-config/list' },
                { method: 'GET' },
            );

            if (response.ok) {
                setConfigs(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving department configs');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi]);

    useEffect(() => {
        getAllConfigs();
    }, [getAllConfigs]);

    const startEditing = (config: DepartmentConfigData) => {
        setEditingDepartment(config.department);
        setEditingWeekends([...config.weekend_days]);
    };

    const cancelEditing = () => {
        setEditingDepartment(null);
        setEditingWeekends([]);
    };

    const toggleWeekday = (day: WeekDay) => {
        setEditingWeekends(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day);
            } else {
                return [...prev, day];
            }
        });
    };

    const saveConfig = useCallback(async () => {
        if (!editingDepartment) return;

        try {
            setLoading(true);
            const payload = { weekend_days: Array.from(editingWeekends) };
            const response = await authedFetchApi<DepartmentConfigData>(
                { path: `/v1/department-config/update/${editingDepartment}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Department weekend configuration updated');
                setEditingDepartment(null);
                setEditingWeekends([]);
                await getAllConfigs();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating configuration');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, editingDepartment, editingWeekends, getAllConfigs]);

    const resetToDefault = useCallback(
        async (department: EmployeeDepartment) => {
            try {
                setLoading(true);
                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/department-config/reset/${department}` },
                    { method: 'DELETE' },
                );

                if (response.ok) {
                    toast.success('Configuration reset to default');
                    await getAllConfigs();
                } else {
                    toast.info('This department is already using default settings');
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while resetting configuration');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getAllConfigs],
    );

    return (
        <>
            <div className="flex flex-col mb-4 gap-2 sm:flex-row sm:justify-between">
                <h2 className="text-xl font-semibold uppercase underline underline-offset-4">
                    Department Weekend Settings
                </h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                Configure which days are considered weekends for each department.
                Work on weekend days counts as overtime.
            </p>

            {loading && configs.length === 0 ? (
                <p className="text-center">Loading...</p>
            ) : (
                <div className="table-responsive text-nowrap text-base">
                    <table className="table border table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>Department</th>
                                {WEEK_DAYS.map(day => (
                                    <th key={day} className="text-center">
                                        {WEEK_DAY_LABELS[day]}
                                    </th>
                                ))}
                                <th>Status</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {configs.map(config => {
                                const isEditing =
                                    editingDepartment === config.department;

                                return (
                                    <tr key={config.department}>
                                        <td className="font-medium">
                                            {config.department}
                                        </td>
                                        {WEEK_DAYS.map(day => {
                                            const isWeekend = isEditing
                                                ? editingWeekends.includes(day)
                                                : config.weekend_days.includes(
                                                      day,
                                                  );

                                            return (
                                                <td
                                                    key={day}
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    {isEditing ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleWeekday(
                                                                    day,
                                                                )
                                                            }
                                                            className={cn(
                                                                'h-6 w-6 rounded border-2 text-xs font-bold transition-colors',
                                                                isWeekend
                                                                    ? 'bg-red-500 border-red-600 text-white'
                                                                    : 'bg-gray-100 border-gray-300 text-gray-400 hover:border-gray-400',
                                                            )}
                                                        >
                                                            {isWeekend
                                                                ? '✓'
                                                                : ''}
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={cn(
                                                                'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold',
                                                                isWeekend
                                                                    ? 'bg-red-100 text-red-600'
                                                                    : 'text-gray-300',
                                                            )}
                                                        >
                                                            {isWeekend
                                                                ? '✓'
                                                                : '-'}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs',
                                                    config.is_default
                                                        ? 'bg-gray-100 text-gray-600'
                                                        : 'bg-blue-100 text-blue-800',
                                                )}
                                            >
                                                {config.is_default
                                                    ? 'Default'
                                                    : 'Custom'}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    saveConfig
                                                                }
                                                                disabled={
                                                                    loading
                                                                }
                                                                className="btn btn-sm btn-primary"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    cancelEditing
                                                                }
                                                                className="btn btn-sm btn-secondary"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditing(
                                                                        config,
                                                                    )
                                                                }
                                                                className="btn btn-sm btn-outline-primary"
                                                            >
                                                                Edit
                                                            </button>
                                                            {!config.is_default && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        resetToDefault(
                                                                            config.department,
                                                                        )
                                                                    }
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                >
                                                                    Reset
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                <strong>Note:</strong> Weekend days marked with ✓ are considered
                off-days. If an employee works on their weekend, all worked hours
                count as overtime.
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

export default DepartmentConfigTable;
