'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import {
    shiftPlanValidationSchema,
    ShiftTemplateFormData,
    STANDARD_SHIFTS,
} from '../../schema';

const shiftTypeOptions = [
    { value: 'morning', label: 'Morning (7:00 AM - 3:00 PM)' },
    { value: 'evening', label: 'Evening (3:00 PM - 11:00 PM)' },
    { value: 'night', label: 'Night (11:00 PM - 7:00 AM)' },
    { value: 'custom', label: 'Custom Times' },
] as const;

const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...EMPLOYEE_DEPARTMENTS.map(dept => ({ value: dept, label: dept })),
];

const Form: React.FC = () => {
    const authedFetchApi = useAuthedFetchApi();
    const router = useRouter();

    const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ShiftTemplateFormData>({
        resolver: zodResolver(shiftPlanValidationSchema),
        defaultValues: {
            employeeIds: [],
            fromDate: '',
            toDate: '',
            shiftType: 'morning',
            shiftStart: STANDARD_SHIFTS.morning.start,
            shiftEnd: STANDARD_SHIFTS.morning.end,
            comment: '',
        },
    });

    const watchedShiftType = watch('shiftType');
    const watchedEmployeeIds = watch('employeeIds');

    const fetchEmployees = useCallback(async () => {
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
                    body: JSON.stringify({ status: 'active' }),
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
    }, [authedFetchApi]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const filteredEmployees = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return employees.filter(emp => {
            if (departmentFilter && emp.department !== departmentFilter)
                return false;
            if (!term) return true;
            return (
                emp.real_name?.toLowerCase().includes(term) ||
                emp.e_id?.toLowerCase().includes(term)
            );
        });
    }, [employees, departmentFilter, searchTerm]);

    const handleEmployeeToggle = (employeeId: string) => {
        const current = watchedEmployeeIds;
        const updated = current.includes(employeeId)
            ? current.filter(id => id !== employeeId)
            : [...current, employeeId];
        setValue('employeeIds', updated, { shouldValidate: true });
    };

    const handleSelectFiltered = () => {
        const filteredIds = filteredEmployees.map(emp => emp._id.toString());
        const allSelected = filteredIds.every(id =>
            watchedEmployeeIds.includes(id),
        );
        const updated = allSelected
            ? watchedEmployeeIds.filter(id => !filteredIds.includes(id))
            : Array.from(new Set([...watchedEmployeeIds, ...filteredIds]));
        setValue('employeeIds', updated, { shouldValidate: true });
    };

    const onSubmit = async (data: ShiftTemplateFormData) => {
        // For standard shifts, enforce standard times
        const payload = { ...data };
        if (payload.shiftType !== 'custom') {
            const standard = STANDARD_SHIFTS[payload.shiftType];
            payload.shiftStart = standard.start;
            payload.shiftEnd = standard.end;
        }

        const response = await authedFetchApi<any>(
            { path: '/v1/shift-plan/create-bulk' },
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            },
        );

        if (response.ok) {
            const count = response.data?.created || 0;
            toast.success(`Successfully created ${count} shift template(s)`);
            router.push('/admin/shift-plans');
        } else {
            toastFetchError(response);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Employee Multi-Select */}
            <div className="mb-6">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Select Employees*</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.employeeIds?.message}
                    </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                        type="text"
                        placeholder="Search by name or ID"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                    <Select
                        options={departmentOptions}
                        isClearable={false}
                        value={
                            departmentOptions.find(
                                opt => opt.value === departmentFilter,
                            ) || departmentOptions[0]
                        }
                        onChange={opt =>
                            setDepartmentFilter(opt ? opt.value : '')
                        }
                        placeholder="All Departments"
                        classNamePrefix="react-select"
                        menuPortalTarget={setMenuPortalTarget}
                    />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSelectFiltered}
                            disabled={loadingEmployees}
                            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-150 shadow-sm disabled:cursor-not-allowed"
                        >
                            Select Filtered
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setValue('employeeIds', [], {
                                    shouldValidate: true,
                                })
                            }
                            className="text-sm px-4 py-2 bg-gray-600 text-white rounded-md hover:opacity-90 transition-all duration-150 shadow-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                    <span>{`${watchedEmployeeIds.length} selected • ${filteredEmployees.length} shown of ${employees.length} active`}</span>
                </div>

                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-gray-50 p-3">
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
                                    className="flex items-center gap-2 p-2 hover:bg-white rounded-md cursor-pointer transition-colors duration-150"
                                >
                                    <input
                                        type="checkbox"
                                        checked={watchedEmployeeIds.includes(
                                            emp._id.toString(),
                                        )}
                                        onChange={() =>
                                            handleEmployeeToggle(
                                                emp._id.toString(),
                                            )
                                        }
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
                        <span className="uppercase">From Date*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.fromDate?.message}
                        </span>
                    </label>
                    <input
                        {...register('fromDate')}
                        type="date"
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">To Date*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.toDate?.message}
                        </span>
                    </label>
                    <input
                        {...register('toDate')}
                        type="date"
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                {/* Shift Type */}
                <div className="md:col-span-2">
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Shift Type*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.shiftType?.message}
                        </span>
                    </label>
                    <Controller
                        name="shiftType"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                options={shiftTypeOptions}
                                isClearable={false}
                                value={
                                    shiftTypeOptions.find(
                                        opt => opt.value === field.value,
                                    ) || null
                                }
                                onChange={opt => {
                                    const type = opt!.value;
                                    field.onChange(type);
                                    if (type !== 'custom') {
                                        const s =
                                            STANDARD_SHIFTS[
                                                type as keyof typeof STANDARD_SHIFTS
                                            ];
                                        setValue('shiftStart', s.start);
                                        setValue('shiftEnd', s.end);
                                    }
                                }}
                                placeholder="Select Shift Type"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                            />
                        )}
                    />
                </div>

                {/* Custom time inputs */}
                {watchedShiftType === 'custom' && (
                    <>
                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    Start Time (HH:mm)*
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftStart?.message}
                                </span>
                            </label>
                            <input
                                {...register('shiftStart')}
                                type="text"
                                placeholder="10:00"
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    End Time (HH:mm)*
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftEnd?.message}
                                </span>
                            </label>
                            <input
                                {...register('shiftEnd')}
                                type="text"
                                placeholder="23:00"
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Comment */}
            <div className="mb-4">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Comment</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.comment?.message}
                    </span>
                </label>
                <textarea
                    {...register('comment')}
                    placeholder="e.g., Week 2, 3, 4..."
                    rows={3}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                />
            </div>

            {/* Submit */}
            <button
                disabled={
                    isSubmitting ||
                    loadingEmployees ||
                    watchedEmployeeIds.length === 0
                }
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
            >
                {isSubmitting ? 'Creating...' : 'Create shift plan'}
            </button>
        </form>
    );
};

export default Form;
