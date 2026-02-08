'use client';

import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
}

const LeaveModal: React.FC<LeaveModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    flags,
    employees,
}) => {
    const authedFetchApi = useAuthedFetchApi();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<LeaveData>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            employeeId: '',
            flagId: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            reason: '',
        },
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                employeeId:
                    employees && employees.length > 0 ? employees[0]!._id : '',
                flagId: flags && flags.length > 0 ? flags[0]!._id : '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: '',
            });
        }
    }, [isOpen, reset, flags, employees]);

    const onSubmit = async (data: LeaveData) => {
        try {
            const response = await authedFetchApi(
                { path: '/v1/leaves' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (!response.ok) {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to apply leave',
                );
                return;
            }

            toast.success('Leave applied successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">New Leave Application</h2>
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
                        <select
                            {...register('employeeId')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Employee...</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.real_name}
                                </option>
                            ))}
                        </select>
                        {errors.employeeId && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.employeeId.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Leave Type
                        </label>
                        <select
                            {...register('flagId')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Type...</option>
                            {flags.map(flag => (
                                <option key={flag._id} value={flag._id}>
                                    {flag.name} ({flag.code})
                                </option>
                            ))}
                        </select>
                        {errors.flagId && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.flagId.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Apply Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveModal;
