'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    ShiftPlanFormData,
    shiftPlanValidationSchema,
    STANDARD_SHIFTS,
} from '../schema';

const Form = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const router = useRouter();
    const authedFetchApi = useAuthedFetchApi();

    const [formData, setFormData] = useState<ShiftPlanFormData>({
        employeeIds: [],
        fromDate: '',
        toDate: '',
        shiftType: 'morning',
        shiftStart: STANDARD_SHIFTS.morning.start,
        shiftEnd: STANDARD_SHIFTS.morning.end,
        changeReason: '',
    });

    // Fetch employees for the dropdown
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoadingEmployees(true);
                const response = await authedFetchApi<any>(
                    {
                        path: '/v1/employee/search-employees',
                        query: { paginated: false },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                    },
                );

                if (response.ok) {
                    setEmployees(response.data.items || response.data);
                } else {
                    toast.error('Failed to load employees');
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while loading employees');
            } finally {
                setLoadingEmployees(false);
            }
        };

        fetchEmployees();
    }, [authedFetchApi]);

    const activeEmployees = useMemo(
        () => employees.filter(emp => emp.status === 'active'),
        [employees],
    );

    const filteredEmployees = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return activeEmployees.filter(emp => {
            const matchesDepartment =
                !departmentFilter || emp.department === departmentFilter;
            if (!matchesDepartment) return false;
            if (!term) return true;
            const name = emp.real_name?.toLowerCase() || '';
            const id = emp.e_id?.toLowerCase() || '';
            return name.includes(term) || id.includes(term);
        });
    }, [activeEmployees, departmentFilter, searchTerm]);

    // Handle shift type change and auto-populate times
    const handleShiftTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const shiftType = e.target.value as
            | 'morning'
            | 'evening'
            | 'night'
            | 'custom';

        if (shiftType === 'custom') {
            // For custom, keep current times or clear them
            setFormData({
                ...formData,
                shiftType: shiftType,
                shiftStart: formData.shiftStart || '10:00',
                shiftEnd: formData.shiftEnd || '23:00',
            });
        } else {
            // Auto-populate standard shift times
            const standardShift = STANDARD_SHIFTS[shiftType];
            setFormData({
                ...formData,
                shiftType: shiftType,
                shiftStart: standardShift.start,
                shiftEnd: standardShift.end,
            });
        }

        // Clear error
        if (errors.shiftType) {
            setErrors({ ...errors, shiftType: '' });
        }
    };

    const handleEmployeeToggle = (employeeId: string) => {
        setFormData(prev => {
            const isSelected = prev.employeeIds.includes(employeeId);
            return {
                ...prev,
                employeeIds: isSelected
                    ? prev.employeeIds.filter(id => id !== employeeId)
                    : [...prev.employeeIds, employeeId],
            };
        });

        // Clear error
        if (errors.employeeIds) {
            setErrors({ ...errors, employeeIds: '' });
        }
    };

    const handleSelectAllEmployees = () => {
        const filteredIds = filteredEmployees.map(emp => emp._id.toString());
        const allFilteredSelected = filteredIds.every(id =>
            formData.employeeIds.includes(id),
        );

        if (allFilteredSelected) {
            const remaining = formData.employeeIds.filter(
                id => !filteredIds.includes(id),
            );
            setFormData({ ...formData, employeeIds: remaining });
        } else {
            setFormData({
                ...formData,
                employeeIds: Array.from(
                    new Set([...formData.employeeIds, ...filteredIds]),
                ),
            });
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });

        // Clear error for this field
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Build payload with proper shift times
            const payload: any = {
                employeeIds: formData.employeeIds,
                fromDate: formData.fromDate,
                toDate: formData.toDate,
                shiftType: formData.shiftType,
                changeReason: formData.changeReason,
            };

            // For standard shifts, use the standard times
            if (formData.shiftType !== 'custom') {
                const standardShift = STANDARD_SHIFTS[formData.shiftType];
                payload.shiftStart = standardShift.start;
                payload.shiftEnd = standardShift.end;
            } else {
                // For custom shifts, include the user-provided times
                payload.shiftStart = formData.shiftStart;
                payload.shiftEnd = formData.shiftEnd;
            }

            const validated = shiftPlanValidationSchema.parse(payload);

            const response = await authedFetchApi<any>(
                { path: '/v1/shift-plan/create-bulk' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(validated),
                },
            );

            if (response.ok) {
                const count = response.data?.created || 0;
                toast.success(`Successfully created ${count} shift plan(s)`);
                router.push('/admin/shift-plans');
            } else {
                toastFetchError(response);
            }
        } catch (error: any) {
            if (error.errors) {
                const newErrors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    if (err.path[0]) {
                        newErrors[err.path[0]] = err.message;
                    }
                });
                setErrors(newErrors);
            } else {
                toast.error('An error occurred');
                console.error(error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Employee Multi-Select */}
            <div className="mb-6">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Select Employees *</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.employeeIds}
                    </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                        <input
                            type="text"
                            placeholder="Search by name or ID"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        />
                    </div>
                    <div>
                        <select
                            value={departmentFilter}
                            onChange={e => setDepartmentFilter(e.target.value)}
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        >
                            <option value="">All Departments</option>
                            {EMPLOYEE_DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>
                                    {dept}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSelectAllEmployees}
                            disabled={loadingEmployees}
                            className="text-sm px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                        >
                            Select Filtered
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData({ ...formData, employeeIds: [] })
                            }
                            className="text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                    <span>{formData.employeeIds.length} selected</span>
                    <span>
                        {filteredEmployees.length} shown of{' '}
                        {activeEmployees.length} active
                    </span>
                </div>

                <div className="border border-gray-200 rounded max-h-60 overflow-y-auto bg-gray-50 p-3">
                    {loadingEmployees ? (
                        <p className="text-gray-500 text-sm">
                            Loading employees...
                        </p>
                    ) : filteredEmployees.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                            No active employees match your filters
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {filteredEmployees.map(emp => (
                                <label
                                    key={emp._id.toString()}
                                    className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.employeeIds.includes(
                                            emp._id.toString(),
                                        )}
                                        onChange={() =>
                                            handleEmployeeToggle(
                                                emp._id.toString(),
                                            )
                                        }
                                        className="h-4 w-4 text-primary rounded"
                                    />
                                    <span className="text-sm text-gray-700">
                                        {emp.real_name} ({emp.e_id})
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                {/* Date Range */}
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">From Date *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.fromDate}
                        </span>
                    </label>
                    <input
                        type="date"
                        name="fromDate"
                        value={formData.fromDate}
                        onChange={handleInputChange}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">To Date *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.toDate}
                        </span>
                    </label>
                    <input
                        type="date"
                        name="toDate"
                        value={formData.toDate}
                        onChange={handleInputChange}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                {/* Shift Type */}
                <div className="md:col-span-2">
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Shift Type *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.shiftType}
                        </span>
                    </label>
                    <select
                        name="shiftType"
                        value={formData.shiftType}
                        onChange={handleShiftTypeChange}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value="morning">
                            Morning (7:00 AM - 3:00 PM)
                        </option>
                        <option value="evening">
                            Evening (3:00 PM - 11:00 PM)
                        </option>
                        <option value="night">
                            Night (11:00 PM - 7:00 AM)
                        </option>
                        <option value="custom">Custom Times</option>
                    </select>
                </div>

                {/* Show time inputs only for custom shifts */}
                {formData.shiftType === 'custom' && (
                    <>
                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    Start Time (HH:mm) *
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftStart}
                                </span>
                            </label>
                            <input
                                type="text"
                                name="shiftStart"
                                placeholder="10:00"
                                value={formData.shiftStart}
                                onChange={handleInputChange}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    End Time (HH:mm) *
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftEnd}
                                </span>
                            </label>
                            <input
                                type="text"
                                name="shiftEnd"
                                placeholder="23:00"
                                value={formData.shiftEnd}
                                onChange={handleInputChange}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                        </div>
                    </>
                )}

                {/* Display standard shift times for non-custom */}
                {formData.shiftType !== 'custom' && (
                    <div className="md:col-span-2">
                        <div className="p-3 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800">
                                <span className="font-semibold">
                                    Standard times for {formData.shiftType}{' '}
                                    shift:
                                </span>{' '}
                                {STANDARD_SHIFTS[formData.shiftType].start} -{' '}
                                {STANDARD_SHIFTS[formData.shiftType].end}
                                {STANDARD_SHIFTS[formData.shiftType]
                                    .crossesMidnight && ' (crosses midnight)'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Change Reason */}
            <div className="mb-4">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Change Reason (Optional)</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.changeReason}
                    </span>
                </label>
                <textarea
                    name="changeReason"
                    placeholder="e.g., Christmas special, Eid break, Emergency staffing..."
                    value={formData.changeReason}
                    onChange={handleInputChange}
                    rows={3}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 uppercase">
                    How This Works
                </h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>
                        Shift plans will be created for all selected employees
                        across the date range
                    </li>
                    <li>
                        Standard shifts (morning/evening/night) use predefined
                        times
                    </li>
                    <li>
                        Custom shifts allow you to set specific times (e.g.,
                        admin hours 10 AM - 11 PM)
                    </li>
                    <li>
                        All employees have a 10-minute grace period to check in
                    </li>
                </ul>
            </div>

            {/* Form Actions */}
            <button
                disabled={
                    isLoading ||
                    loadingEmployees ||
                    formData.employeeIds.length === 0
                }
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
            >
                {isLoading ? 'Creating...' : `Create shift plans`}
            </button>
        </form>
    );
};

export default Form;
