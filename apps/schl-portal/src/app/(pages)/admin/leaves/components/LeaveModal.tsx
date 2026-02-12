'use client';

import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    leavePaidOptions,
    leaveTypeOptions,
} from '@repo/common/constants/leave.constant';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { LeaveData, leaveSchema } from '../schema';

interface AttendanceFlag {
    _id: string;
    name: string;
    code: string;
}

interface Employee {
    _id: string;
    real_name: string;
}

interface LeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    flags: AttendanceFlag[];
    employees: Employee[];
    // when provided, the modal acts as Edit mode
    initialData?: any;
}

const LeaveModal: React.FC<LeaveModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    flags,
    employees,
    initialData,
}) => {
    const authedFetchApi = useAuthedFetchApi();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<LeaveData>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            employeeId: '',
            leaveType: 'casual',
            isPaid: true,
            status: 'pending',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit mode - prefill with existing leave
                reset({
                    employeeId:
                        typeof initialData.employee === 'object'
                            ? initialData.employee._id
                            : initialData.employee || '',
                    leaveType: initialData.leave_type || 'casual',
                    isPaid:
                        typeof initialData.is_paid === 'boolean'
                            ? initialData.is_paid
                            : true,
                    status: initialData.status || 'pending',
                    startDate: initialData.start_date
                        ? new Date(initialData.start_date)
                              .toISOString()
                              .split('T')[0]
                        : new Date().toISOString().split('T')[0],
                    endDate: initialData.end_date
                        ? new Date(initialData.end_date)
                              .toISOString()
                              .split('T')[0]
                        : new Date().toISOString().split('T')[0],
                    reason: initialData.reason || '',
                });
            } else {
                // Create mode - defaults
                reset({
                    employeeId:
                        employees && employees.length > 0
                            ? employees[0]!._id
                            : '',
                    leaveType: 'casual',
                    isPaid: true,
                    status: 'pending',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    reason: '',
                });
            }
        }
    }, [isOpen, reset, employees, setValue, initialData]);

    const onSubmit = async (data: LeaveData) => {
        try {
            let response;

            if (initialData && initialData._id) {
                // Edit mode
                response = await authedFetchApi(
                    { path: `/v1/leaves/${initialData._id}` },
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    },
                );
            } else {
                // Create mode
                response = await authedFetchApi(
                    { path: '/v1/leaves' },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    },
                );
            }

            if (!response.ok) {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to apply leave',
                );
                return;
            }

            toast.success(
                initialData ? 'Leave updated' : 'Leave applied successfully',
            );
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        }
    };

    // compute days (inclusive) from startDate/endDate
    const _start = watch('startDate');
    const _end = watch('endDate');
    const daysCount = useMemo(() => {
        if (!_start || !_end) return '';
        const s = new Date(_start);
        const e = new Date(_end);
        const diff =
            Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        return diff > 0 ? String(diff) : '0';
    }, [_start, _end]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {initialData
                            ? 'Edit Leave Application'
                            : 'New Leave Application'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Employee
                        </label>
                        <div className="mt-1">
                            <Select
                                {...setClassNameAndIsDisabled(isOpen)}
                                options={employees.map(e => ({
                                    label: e.real_name,
                                    value: e._id,
                                }))}
                                closeMenuOnSelect
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                styles={setCalculatedZIndex(50)}
                                value={
                                    employees
                                        .map(e => ({
                                            label: e.real_name,
                                            value: e._id,
                                        }))
                                        .find(
                                            o =>
                                                o.value === watch('employeeId'),
                                        ) || null
                                }
                                onChange={(selected: any) =>
                                    setValue(
                                        'employeeId',
                                        (selected && selected.value) ?? '',
                                    )
                                }
                                placeholder="Select Employee..."
                                isSearchable
                            />
                        </div>
                        {errors.employeeId && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.employeeId.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Leave Category
                            </label>
                            <div className="mt-1">
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={leaveTypeOptions}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(50)}
                                    value={
                                        leaveTypeOptions.find(
                                            o => o.value === watch('leaveType'),
                                        ) || null
                                    }
                                    onChange={(selected: any) =>
                                        setValue(
                                            'leaveType',
                                            (selected && selected.value) ??
                                                'casual',
                                        )
                                    }
                                    placeholder="Select Leave Category"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Paid
                            </label>
                            <div className="mt-1">
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={leavePaidOptions}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(50)}
                                    value={
                                        leavePaidOptions.find(
                                            o => o.value === watch('isPaid'),
                                        ) || null
                                    }
                                    onChange={(selected: any) =>
                                        setValue(
                                            'isPaid',
                                            (selected && selected.value) ??
                                                false,
                                        )
                                    }
                                    placeholder="Select Paid/Unpaid"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Start Date
                            </label>
                            <input
                                type="date"
                                {...register('startDate')}
                                className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            {errors.startDate && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.startDate.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                End Date
                            </label>
                            <input
                                type="date"
                                {...register('endDate')}
                                className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            {errors.endDate && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.endDate.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Days
                            </label>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={daysCount}
                                className="mt-1 block w-full bg-gray-100 border border-gray-200 rounded-md p-2 text-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Status
                            </label>
                            <div className="mt-1">
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={
                                        initialData
                                            ? [
                                                  {
                                                      label: 'Pending',
                                                      value: 'pending',
                                                  },
                                                  {
                                                      label: 'Approved',
                                                      value: 'approved',
                                                  },
                                                  {
                                                      label: 'Rejected',
                                                      value: 'rejected',
                                                  },
                                              ]
                                            : [
                                                  {
                                                      label: 'Pending',
                                                      value: 'pending',
                                                  },
                                                  {
                                                      label: 'Approved',
                                                      value: 'approved',
                                                  },
                                              ]
                                    }
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(50)}
                                    value={
                                        (initialData
                                            ? [
                                                  {
                                                      label: 'Pending',
                                                      value: 'pending',
                                                  },
                                                  {
                                                      label: 'Approved',
                                                      value: 'approved',
                                                  },
                                                  {
                                                      label: 'Rejected',
                                                      value: 'rejected',
                                                  },
                                              ]
                                            : [
                                                  {
                                                      label: 'Pending',
                                                      value: 'pending',
                                                  },
                                                  {
                                                      label: 'Approved',
                                                      value: 'approved',
                                                  },
                                              ]
                                        ).find(
                                            o => o.value === watch('status'),
                                        ) || null
                                    }
                                    onChange={(selected: any) =>
                                        setValue(
                                            'status',
                                            (selected && selected.value) ??
                                                'pending',
                                        )
                                    }
                                    placeholder="Select status"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Reason
                        </label>
                        <textarea
                            {...register('reason')}
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.reason && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.reason.message}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={() => handleSubmit(onSubmit)()}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : initialData
                                  ? 'Update Leave'
                                  : 'Apply Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveModal;
