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
    ShiftAdjustmentFormData,
    shiftAdjustmentSchema,
    STANDARD_SHIFTS,
} from '../../../schema';

const adjustmentTypeOptions = [
    { value: 'replace', label: 'Replace (set new shift)' },
    { value: 'off_day', label: 'Off Day (mark as OT)' },
    { value: 'cancel', label: 'Cancel (no shift)' },
] as const;

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

const AdjustmentForm = () => {
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
    } = useForm<ShiftAdjustmentFormData>({
        resolver: zodResolver(shiftAdjustmentSchema),
        defaultValues: {
            employeeId: '',
            shiftDate: '',
            adjustmentType: 'replace',
            shiftType: 'morning',
            shiftStart: STANDARD_SHIFTS.morning.start,
            shiftEnd: STANDARD_SHIFTS.morning.end,
            gracePeriodMinutes: undefined,
            comment: '',
        },
    });

    const watchedAdjustmentType = watch('adjustmentType');
    const watchedShiftType = watch('shiftType');

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

    const employeeSelectOptions = useMemo(
        () =>
            filteredEmployees.map(emp => ({
                value: emp._id.toString(),
                label: `${emp.real_name} (${emp.e_id})`,
            })),
        [filteredEmployees],
    );

    const onSubmit = async (data: ShiftAdjustmentFormData) => {
        const response = await authedFetchApi<any>(
            { path: '/v1/shift-plan/adjustments/create' },
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            },
        );

        if (response.ok) {
            toast.success('Shift adjustment created successfully');
            router.push('/admin/shift-plans');
        } else {
            toastFetchError(response);
        }
    };

    const standardShift =
        watchedShiftType && watchedShiftType !== 'custom'
            ? STANDARD_SHIFTS[watchedShiftType as keyof typeof STANDARD_SHIFTS]
            : null;

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Employee select */}
            <div className="mb-6">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Select Employee *</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.employeeId?.message}
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
                </div>

                <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                        <Select
                            options={employeeSelectOptions}
                            isLoading={loadingEmployees}
                            isDisabled={loadingEmployees}
                            placeholder={
                                loadingEmployees
                                    ? 'Loading employees...'
                                    : 'Select an employee'
                            }
                            classNamePrefix="react-select"
                            menuPortalTarget={setMenuPortalTarget}
                            value={
                                employeeSelectOptions.find(
                                    opt => opt.value === field.value,
                                ) || null
                            }
                            onChange={opt =>
                                field.onChange(opt ? opt.value : '')
                            }
                        />
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                {/* Shift Date */}
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Shift Date *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.shiftDate?.message}
                        </span>
                    </label>
                    <input
                        {...register('shiftDate')}
                        type="date"
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>

                {/* Adjustment Type */}
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Adjustment Type *</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.adjustmentType?.message}
                        </span>
                    </label>
                    <Controller
                        name="adjustmentType"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                options={adjustmentTypeOptions}
                                isClearable={false}
                                value={
                                    adjustmentTypeOptions.find(
                                        opt => opt.value === field.value,
                                    ) || null
                                }
                                onChange={opt =>
                                    field.onChange(opt ? opt.value : '')
                                }
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                            />
                        )}
                    />
                </div>

                {/* Replace-only: shift type, times */}
                {watchedAdjustmentType === 'replace' && (
                    <>
                        <div className="md:col-span-2">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Shift Type *</span>
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
                                                opt =>
                                                    opt.value === field.value,
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
                                        classNamePrefix="react-select"
                                        menuPortalTarget={setMenuPortalTarget}
                                    />
                                )}
                            />
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    Start Time (HH:mm) *
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftStart?.message}
                                </span>
                            </label>
                            <input
                                {...register('shiftStart')}
                                type="text"
                                placeholder="10:00"
                                disabled={watchedShiftType !== 'custom'}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    End Time (HH:mm) *
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.shiftEnd?.message}
                                </span>
                            </label>
                            <input
                                {...register('shiftEnd')}
                                type="text"
                                placeholder="23:00"
                                disabled={watchedShiftType !== 'custom'}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Grace Period + Comment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4">
                {watchedAdjustmentType === 'replace' && (
                    <div>
                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                            <span className="uppercase">
                                Grace Period (Min)
                            </span>
                        </label>
                        <input
                            {...register('gracePeriodMinutes', {
                                valueAsNumber: true,
                            })}
                            type="number"
                            min={0}
                            max={120}
                            placeholder="10"
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        />
                        <p className="text-xs font-mono text-gray-400 flex flex-row gap-2 mt-1">
                            Minutes allowed late before flagging as delayed
                        </p>
                    </div>
                )}

                <div
                    className={
                        watchedAdjustmentType === 'replace'
                            ? ''
                            : 'md:col-span-2'
                    }
                >
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Comment (Optional)</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.comment?.message}
                        </span>
                    </label>
                    <textarea
                        {...register('comment')}
                        placeholder="e.g., Eid special, Emergency staffing"
                        rows={3}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>
            </div>

            {/* Submit */}
            <button
                disabled={isSubmitting || loadingEmployees}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
            >
                {isSubmitting ? 'Saving...' : 'Create adjustment'}
            </button>
        </form>
    );
};

export default AdjustmentForm;
