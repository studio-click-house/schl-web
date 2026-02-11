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
}

const HolidayModal: React.FC<HolidayModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editData,
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
        mode: 'onBlur', // Validate on blur to provide timely client-side feedback
        defaultValues: {
            name: '',
            dateFrom: new Date().toISOString().split('T')[0],
            dateTo: '',
            comment: '',
        },
    });

    useEffect(() => {
        if (isOpen && editData) {
            reset({
                name: editData.name,
                // Ensure dates are YYYY-MM-DD
                dateFrom: new Date((editData as any).dateFrom || editData.dateFrom).toISOString().split('T')[0],
                dateTo: (editData as any).dateTo ? new Date((editData as any).dateTo).toISOString().split('T')[0] : '',
                comment: (editData as any).comment || '',
            });
        } else if (isOpen) {
            reset({
                name: '',
                dateFrom: new Date().toISOString().split('T')[0],
                dateTo: '',
                comment: '',
            });
        }
    }, [isOpen, editData, reset]);

    const onSubmit = async (data: HolidayData) => {
        try {
            const url = isEdit
                ? `/v1/holidays/${editData._id}`
                : '/v1/holidays';
            const method = isEdit ? 'PUT' : 'POST';

            // Don't send empty string for optional fields - omit them so backend @IsOptional passes
            const payload: any = { name: data.name, dateFrom: data.dateFrom };
            if (data.dateTo && data.dateTo.trim() !== '') payload.dateTo = data.dateTo;
            if (data.comment && data.comment.trim() !== '') payload.comment = data.comment.trim();

            const response = await authedFetchApi(
                { path: url },
                {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <input
                            type="text"
                            {...register('name')}
                            autoComplete="off"
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
                            Start Date
                        </label>
                        <input
                            type="date"
                            {...register('dateFrom')}
                            autoComplete="off"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.dateFrom && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.dateFrom.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            End Date (optional)
                        </label>
                        <input
                            type="date"
                            {...register('dateTo')}
                            autoComplete="off"
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.dateTo && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.dateTo.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Comment (optional)
                        </label>
                        <textarea
                            {...register('comment')}
                            autoComplete="off"
                            rows={3}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.comment && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.comment.message}
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
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HolidayModal;
