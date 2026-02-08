'use client';

import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { HolidayData, holidaySchema } from '../schema';

interface AttendanceFlag {
    _id: string;
    name: string;
    code: string;
    color: string;
}

interface HolidayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: (HolidayData & { _id: string }) | null;
    flags: AttendanceFlag[];
}

const HolidayModal: React.FC<HolidayModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editData,
    flags,
}) => {
    const authedFetchApi = useAuthedFetchApi();
    const isEdit = !!editData;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<HolidayData>({
        resolver: zodResolver(holidaySchema),
        defaultValues: {
            name: '',
            date: new Date().toISOString().split('T')[0],
            flagId: '',
            recurring: false,
        },
    });

    useEffect(() => {
        if (isOpen && editData) {
            reset({
                name: editData.name,
                // Ensure date is YYYY-MM-DD
                date: new Date(editData.date).toISOString().split('T')[0],
                flagId: editData.flagId,
                recurring: editData.recurring,
            });
        } else if (isOpen) {
            reset({
                name: '',
                date: new Date().toISOString().split('T')[0],
                flagId: flags && flags.length > 0 ? flags[0]!._id : '',
                recurring: false,
            });
        }
    }, [isOpen, editData, reset, flags]);

    const onSubmit = async (data: HolidayData) => {
        try {
            const url = isEdit
                ? `/v1/holidays/${editData._id}`
                : '/v1/holidays';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await authedFetchApi(
                { path: url },
                {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (!response.ok) {
                const msg = response.data.message;
                toast.error(
                    Array.isArray(msg)
                        ? msg.join(', ')
                        : msg || 'Failed to save holiday',
                );
                return;
            }

            toast.success(
                `Holiday ${isEdit ? 'updated' : 'created'} successfully`,
            );
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
                    <h2 className="text-xl font-bold">
                        {isEdit ? 'Edit Holiday' : 'Create Holiday'}
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
                            Name
                        </label>
                        <input
                            type="text"
                            {...register('name')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Date
                        </label>
                        <input
                            type="date"
                            {...register('date')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.date && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.date.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Attendance Flag (Effect)
                        </label>
                        <select
                            {...register('flagId')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a flag...</option>
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

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="recurring"
                            {...register('recurring')}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                            htmlFor="recurring"
                            className="text-sm font-medium text-gray-700"
                        >
                            Repeats Annually?
                        </label>
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
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HolidayModal;
