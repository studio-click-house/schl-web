'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    ShiftOverrideFormData,
    shiftOverrideSchema,
    STANDARD_SHIFTS,
} from '../../../schema';

const OverrideForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const router = useRouter();
    const authedFetchApi = useAuthedFetchApi();

    const [formData, setFormData] = useState<ShiftOverrideFormData>({
        employeeId: '',
        shiftDate: '',
        overrideType: 'replace',
        shiftType: 'morning',
        shiftStart: STANDARD_SHIFTS.morning.start,
        shiftEnd: STANDARD_SHIFTS.morning.end,
        changeReason: '',
    });

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

    const handleShiftTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const shiftType = e.target.value as
            | 'morning'
            | 'evening'
            | 'night'
            | 'custom';

        if (shiftType === 'custom') {
            setFormData(prev => ({
                ...prev,
                shiftType,
                shiftStart: prev.shiftStart || '10:00',
                shiftEnd: prev.shiftEnd || '23:00',
            }));
        } else {
            const standardShift = STANDARD_SHIFTS[shiftType];
            setFormData(prev => ({
                ...prev,
                shiftType,
                shiftStart: standardShift.start,
                shiftEnd: standardShift.end,
            }));
        }

        if (errors.shiftType) {
            setErrors(prev => ({ ...prev, shiftType: '' }));
        }
    };

    const handleOverrideTypeChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const overrideType = e.target.value as 'replace' | 'cancel';
        setFormData(prev => ({
            ...prev,
            overrideType,
        }));

        if (errors.overrideType) {
            setErrors(prev => ({ ...prev, overrideType: '' }));
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload: ShiftOverrideFormData = {
                employeeId: formData.employeeId,
                shiftDate: formData.shiftDate,
                overrideType: formData.overrideType,
                changeReason: formData.changeReason,
            };

            if (formData.overrideType === 'replace') {
                payload.shiftType = formData.shiftType;
                payload.shiftStart = formData.shiftStart;
                payload.shiftEnd = formData.shiftEnd;
            }

            const validated = shiftOverrideSchema.parse(payload);

            const response = await authedFetchApi<any>(
                { path: '/v1/shift-plan/create' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(validated),
                },
            );

            if (response.ok) {
                toast.success('Shift override created successfully');
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

    const standardShift =
        formData.shiftType && formData.shiftType !== 'custom'
            ? STANDARD_SHIFTS[formData.shiftType]
            : null;

    return (
        <form onSubmit={handleSubmit}>
            <div className="mb-6">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Select Employee *</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.employeeId}
                    </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                        type="text"
                        placeholder="Search by name or ID"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
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

                <select
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    disabled={loadingEmployees}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <option value="">
                        {loadingEmployees
                            ? 'Loading employees...'
                            : 'Select an employee'}
                    </option>
                    {filteredEmployees.map(emp => (
                        <option
                            key={emp._id.toString()}
                            value={emp._id.toString()}
                        >
                            {emp.real_name} ({emp.e_id})
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Shift Date *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.shiftDate}
                        </span>
                    </label>
                    <input
                        type="date"
                        name="shiftDate"
                        value={formData.shiftDate}
                        onChange={handleInputChange}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Override Type *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.overrideType}
                        </span>
                    </label>
                    <select
                        name="overrideType"
                        value={formData.overrideType}
                        onChange={handleOverrideTypeChange}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value="replace">Replace (set new shift)</option>
                        <option value="cancel">Cancel (no shift)</option>
                    </select>
                </div>

                {formData.overrideType === 'replace' && (
                    <>
                        <div className="md:col-span-2">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Shift Type *</span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftType}
                                </span>
                            </label>
                            <select
                                name="shiftType"
                                value={formData.shiftType || 'morning'}
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
                                        value={formData.shiftStart || ''}
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
                                        value={formData.shiftEnd || ''}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                </div>
                            </>
                        )}

                        {formData.shiftType !== 'custom' && standardShift && (
                            <div className="md:col-span-2">
                                <div className="p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-sm text-green-800">
                                        <span className="font-semibold">
                                            Standard times for{' '}
                                            {formData.shiftType} shift:
                                        </span>{' '}
                                        {standardShift.start} -
                                        {standardShift.end}
                                        {standardShift.crossesMidnight &&
                                            ' (crosses midnight)'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mb-4">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Change Reason (Optional)</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.changeReason}
                    </span>
                </label>
                <textarea
                    name="changeReason"
                    placeholder="e.g., Eid special, Emergency staffing"
                    value={formData.changeReason || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                />
            </div>

            <button
                disabled={isLoading || loadingEmployees}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
            >
                {isLoading ? 'Saving...' : 'Create override'}
            </button>
        </form>
    );
};

export default OverrideForm;
