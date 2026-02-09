'use client';
import { MultiSelectWithAll } from '@/components/MultiSelectWithAll';
import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { DepartmentData, departmentSchema } from '../schema';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData: (DepartmentData & { _id: string }) | null;
}

const WEEK_DAYS = [
    { label: 'Sunday', value: '0' },
    { label: 'Monday', value: '1' },
    { label: 'Tuesday', value: '2' },
    { label: 'Wednesday', value: '3' },
    { label: 'Thursday', value: '4' },
    { label: 'Friday', value: '5' },
    { label: 'Saturday', value: '6' },
];

const DEPARTMENT_OPTIONS = EMPLOYEE_DEPARTMENTS.map(d => ({
    label: d,
    value: d,
}));

const DepartmentModal: React.FC<ModalProps> = ({
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
        control,
        formState: { errors, isSubmitting },
    } = useForm<DepartmentData>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: '',
            weekend_days: [5], // Default Friday
            description: '',
        },
    });

    useEffect(() => {
        if (isOpen && editData) {
            reset({
                name: editData.name,
                weekend_days: editData.weekend_days,
                description: editData.description || '',
            });
        } else if (isOpen) {
            reset({
                name: '',
                weekend_days: [0], // Default Sunday
                description: '',
            });
        }
    }, [isOpen, editData, reset]);

    const onSubmit = async (data: DepartmentData) => {
        try {
            const url = isEdit
                ? `/v1/departments/${editData._id}`
                : '/v1/departments';
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
                // Check if validation error (400) or other
                if (response.status === 400 && response.data.message) {
                    // Log details for debugging specifically if needed
                    console.error('Validation Errors:', response.data.message);
                }
                const msg = response.data.message;

                // Show a generic message or specific one if simple string
                if (Array.isArray(msg)) {
                    toast.error('Please check your input fields');
                } else {
                    toast.error(msg || 'Failed to save department');
                }
                return;
            }

            toast.success(
                `Department ${isEdit ? 'updated' : 'created'} successfully`,
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
                        {isEdit ? 'Edit Department' : 'Create Department'}
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
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    options={DEPARTMENT_OPTIONS}
                                    value={DEPARTMENT_OPTIONS.find(
                                        c => c.value === value,
                                    )}
                                    onChange={val => onChange(val?.value)}
                                    placeholder="Select Department"
                                    className="mt-1 block w-full"
                                    classNamePrefix="react-select"
                                />
                            )}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weekend Days
                        </label>
                        <Controller
                            control={control}
                            name="weekend_days"
                            render={({ field: { onChange, value } }) => (
                                <MultiSelectWithAll
                                    options={WEEK_DAYS}
                                    value={value?.map(String) || []}
                                    onChange={vals =>
                                        onChange(vals.map(Number))
                                    }
                                    placeholder="Select Weekend Days"
                                />
                            )}
                        />
                        {errors.weekend_days && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.weekend_days.message}
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

export default DepartmentModal;
