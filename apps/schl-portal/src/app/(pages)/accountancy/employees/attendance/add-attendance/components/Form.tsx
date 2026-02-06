'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ATTENDANCE_STATUSES,
    VERIFY_MODES,
    attendanceStatusOptions,
    verifyModeOptions,
} from '@repo/common/constants/attendance.constant';
import { hasPerm } from '@repo/common/utils/permission-check';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { Undo2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { AttendanceCreateData, validationSchema } from '../schema';

interface PropsType {
    employeeId: string;
    employeeName: string;
    userId: string;
}

const Form: React.FC<PropsType> = ({ employeeId, employeeName, userId }) => {
    const authedFetchApi = useAuthedFetchApi();
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<AttendanceCreateData>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            employeeId,
            userId,
            inTime: '',
            inRemark: '',
            outTime: '',
            outRemark: '',
            verifyMode: VERIFY_MODES[VERIFY_MODES.length - 1],
            status: ATTENDANCE_STATUSES[0],
        },
    });

    async function createAttendance(data: AttendanceCreateData) {
        try {
            const parsed = validationSchema.safeParse(data);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            setLoading(true);

            const payload = {
                ...parsed.data,
                inRemark: parsed.data.inRemark || '',
                outRemark: parsed.data.outRemark || '',
                outTime: parsed.data.outTime || undefined,
            };

            if (hasPerm('admin:create_attendance', userPermissions)) {
                const response = await authedFetchApi(
                    { path: '/v1/attendance/create-attendance' },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    },
                );

                if (response.ok) {
                    toast.success('Created attendance record successfully');
                    reset();
                } else {
                    toastFetchError(response);
                }
            } else {
                toast.error(
                    "You don't have permission to create attendance records",
                );
            }
        } catch (error) {
            console.error('Error creating attendance:', error);
            toast.error('An error occurred while creating attendance');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (data: AttendanceCreateData) => {
        if (!userId) {
            toast.error('No device user mapping found for this employee');
            return;
        }
        await createAttendance(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register('employeeId')} />
            <input type="hidden" {...register('userId')} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Employee</span>
                    </label>
                    <input
                        value={employeeName}
                        disabled
                        className="appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight"
                        placeholder="Employee name"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">User ID</span>
                    </label>
                    <input
                        value={userId || 'Not available'}
                        disabled
                        className="appearance-none block w-full bg-gray-100 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight"
                        placeholder="User ID"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">In Time*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.inTime && errors.inTime.message}
                        </span>
                    </label>
                    <input
                        {...register('inTime')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        type="datetime-local"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Out Time</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.outTime && errors.outTime.message}
                        </span>
                    </label>
                    <input
                        {...register('outTime')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        type="datetime-local"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Verify Mode*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.verifyMode && errors.verifyMode.message}
                        </span>
                    </label>
                    <Controller
                        name="verifyMode"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={verifyModeOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select verify mode"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    verifyModeOptions.find(
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
                        <span className="uppercase">Status*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.status && errors.status.message}
                        </span>
                    </label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={attendanceStatusOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select status"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    attendanceStatusOptions.find(
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">In Remark</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.inRemark && errors.inRemark.message}
                        </span>
                    </label>
                    <textarea
                        {...register('inRemark')}
                        rows={4}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        placeholder="Optional note for check-in"
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                        <span className="uppercase">Out Remark</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.outRemark && errors.outRemark.message}
                        </span>
                    </label>
                    <textarea
                        {...register('outRemark')}
                        rows={4}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        placeholder="Optional note for check-out"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    disabled={loading || !userId}
                    className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
                    type="submit"
                >
                    {loading ? 'Creating...' : 'Create attendance'}
                </button>
                {/* Go back to employee attendance table redirect button */}
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex gap-2 items-center justify-between ml-4 rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-10 py-2 mt-6 uppercase"
                >
                    Go back <Undo2 size={16} />
                </button>
            </div>
        </form>
    );
};

export default Form;
