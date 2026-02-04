'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { hasPerm } from '@repo/common/utils/permission-check';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { DeviceUserDataType, validationSchema } from '../../schema';

interface PropsType {
    employeesData: EmployeeDocument[];
}

const Form: React.FC<PropsType> = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const employeeOptions = useMemo(
        () =>
            (props.employeesData || []).map(employee => ({
                value: String(employee._id),
                label: `${employee.real_name} (${employee.e_id})`,
            })),
        [props.employeesData],
    );

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<DeviceUserDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            user_id: '',
            card_number: '',
            employee: '',
            comment: '',
        },
    });

    async function createDeviceUser(data: DeviceUserDataType) {
        try {
            const parsed = validationSchema.safeParse(data);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            setLoading(true);

            const createData = {
                userId: parsed.data.user_id,
                cardNumber: parsed.data.card_number || null,
                employeeId: parsed.data.employee,
                comment: parsed.data.comment || '',
            };

            if (hasPerm('admin:create_device_user', userPermissions)) {
                const response = await authedFetchApi(
                    { path: '/v1/device-user/create-user' },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(createData),
                    },
                );

                if (response.ok) {
                    toast.success('Created new device user successfully');
                    reset();
                } else {
                    toastFetchError(response);
                }
            } else {
                toast.error(
                    'You do not have permission to create device users',
                );
            }
        } catch (error) {
            console.error('Error creating device user:', error);
            toast.error('An error occurred while creating device user');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (data: DeviceUserDataType) => {
        await createDeviceUser(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">User ID*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.user_id && errors.user_id.message}
                        </span>
                    </label>
                    <input
                        {...register('user_id')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        placeholder="Enter user ID"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Employee*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.employee && errors.employee.message}
                        </span>
                    </label>
                    <Controller
                        name="employee"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={employeeOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select employee"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    employeeOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option?.value || '')
                                }
                            />
                        )}
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Card Number</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.card_number && errors.card_number.message}
                        </span>
                    </label>
                    <input
                        {...register('card_number')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        placeholder="Enter card number"
                    />
                </div>
            </div>

            <div>
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Comment</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.comment && errors.comment?.message}
                    </span>
                </label>
                <textarea
                    {...register('comment')}
                    rows={5}
                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    placeholder="Write any note about the device user"
                />
            </div>

            <button
                disabled={loading}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
                type="submit"
            >
                {loading ? 'Creating...' : 'Create this device user'}
            </button>
        </form>
    );
};

export default Form;
