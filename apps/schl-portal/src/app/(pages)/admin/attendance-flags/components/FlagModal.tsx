'use client';

import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AttendanceFlagData, attendanceFlagSchema } from '../schema';

interface FlagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: (AttendanceFlagData & { _id: string }) | null;
}

const FlagModal: React.FC<FlagModalProps> = ({
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
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<AttendanceFlagData>({
        resolver: zodResolver(attendanceFlagSchema),
        defaultValues: {
            code: '',
            name: '',
            color: '#000000',
            description: '',
        },
    });

    useEffect(() => {
        if (isOpen && editData) {
            reset({
                code: editData.code,
                name: editData.name,
                description: editData.description || '',
                color: editData.color,
            });
        } else if (isOpen) {
            reset({
                code: '',
                name: '',
                description: '',
                color: '#000000',
            });
        }
    }, [isOpen, editData, reset]);

    const onSubmit = async (data: AttendanceFlagData) => {
        try {
            const url = isEdit
                ? `/v1/attendance-flags/${editData._id}`
                : '/v1/attendance-flags';
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
                        : msg || 'Failed to save flag',
                );
                return;
            }

            toast.success(
                `Flag ${isEdit ? 'updated' : 'created'} successfully`,
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
                        {isEdit ? 'Edit Flag' : 'Create Flag'}
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
                            Code
                        </label>
                        <input
                            type="text"
                            {...register('code')}
                            disabled={isEdit} // Code should probably be immutable or definitely carefully changed
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        />
                        {errors.code && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.code.message}
                            </p>
                        )}
                    </div>

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
                            Description
                        </label>
                        <textarea
                            {...register('description')}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                {...register('color')}
                                className="h-10 w-10 border border-gray-300 p-1 rounded"
                            />
                            <input
                                type="text"
                                {...register('color')}
                                className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 uppercase"
                            />
                        </div>
                        {errors.color && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.color.message}
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

export default FlagModal;
