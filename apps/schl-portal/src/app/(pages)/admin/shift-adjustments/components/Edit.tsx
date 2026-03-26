'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    STANDARD_SHIFTS,
    adjustmentTypeOptions,
    shiftTypeOptions,
} from '@repo/common/constants/shift.constant';
import { ShiftAdjustment } from '@repo/common/models/shift-adjustment.schema';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { SquarePen, X } from 'lucide-react';
import moment from 'moment-timezone';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { ShiftAdjustmentEditData, shiftAdjustmentEditSchema } from '../schema';

const baseZIndex = 50;

interface ShiftAdjustmentWithId extends ShiftAdjustment {
    _id: string;
}

interface EditButtonProps {
    adjustment: ShiftAdjustmentWithId;
    submitHandler: () => void;
}

const EditButton = ({ adjustment, submitHandler }: EditButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const authedFetchApi = useAuthedFetchApi();
    const popupRef = useRef<HTMLElement>(null);

    const shiftDateString = adjustment.shift_date
        ? moment.tz(adjustment.shift_date, 'Asia/Dhaka').format('YYYY-MM-DD')
        : '';

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ShiftAdjustmentEditData>({
        resolver: zodResolver(shiftAdjustmentEditSchema),
        defaultValues: {
            shiftDate: shiftDateString || '',
            adjustmentType: adjustment.adjustment_type,
            shiftType: adjustment.shift_type || undefined,
            shiftStart: adjustment.shift_start || undefined,
            shiftEnd: adjustment.shift_end || undefined,
            gracePeriodMinutes: adjustment.grace_period_minutes ?? 10,
            active: adjustment.active,
            comment: adjustment.comment || undefined,
        },
    });

    const watchedAdjustmentType = watch('adjustmentType');
    const watchedShiftType = watch('shiftType');

    useEffect(() => {
        if (isOpen) {
            reset({
                shiftDate: shiftDateString,
                adjustmentType: adjustment.adjustment_type,
                shiftType: adjustment.shift_type || undefined,
                shiftStart: adjustment.shift_start || undefined,
                shiftEnd: adjustment.shift_end || undefined,
                gracePeriodMinutes: adjustment.grace_period_minutes ?? 10,
                active: adjustment.active,
                comment: adjustment.comment || undefined,
            });
        }
    }, [isOpen, adjustment, reset, shiftDateString]);

    const onSubmit = async (data: ShiftAdjustmentEditData) => {
        try {
            const bodyData = { ...data };
            if (data.adjustmentType === 'cancel') {
                // Clean up unneeded fields
                bodyData.shiftType = undefined;
                bodyData.shiftStart = undefined;
                bodyData.shiftEnd = undefined;
            } else if (data.adjustmentType === 'off_day') {
                bodyData.shiftType = undefined; // backend allows it empty for off_day, or keeps old? We clear it
            }

            const response = await authedFetchApi<ShiftAdjustment>(
                { path: `/v1/shift-adjustment/${adjustment._id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData),
                },
            );

            if (response.ok) {
                toast.success('Shift adjustment updated successfully');
                setIsOpen(false);
                submitHandler();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred');
        }
    };

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector(
                'input:focus, textarea:focus, select:focus',
            )
        ) {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded-md bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <SquarePen size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'} `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative lg:w-[50vw] md:w-[70vw] sm:w-[80vw]`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Edit Shift Adjustment
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center "
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <form
                        className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                            <div className="">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Shift Date
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    {...register('shiftDate')}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.shiftDate && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.shiftDate.message}
                                    </p>
                                )}
                            </div>

                            <div className="">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Adjustment Type
                                    </span>
                                </label>
                                <Controller
                                    name="adjustmentType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            {...setClassNameAndIsDisabled(
                                                isOpen,
                                            )}
                                            options={adjustmentTypeOptions}
                                            closeMenuOnSelect={true}
                                            classNamePrefix="react-select"
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            menuPlacement="auto"
                                            menuPosition="fixed"
                                            styles={setCalculatedZIndex(
                                                baseZIndex,
                                            )}
                                            value={
                                                adjustmentTypeOptions.find(
                                                    opt =>
                                                        opt.value ===
                                                        field.value,
                                                ) || null
                                            }
                                            onChange={opt => {
                                                if (opt) {
                                                    field.onChange(opt.value);
                                                    if (
                                                        opt.value === 'cancel'
                                                    ) {
                                                        setValue(
                                                            'shiftStart',
                                                            undefined,
                                                        );
                                                        setValue(
                                                            'shiftEnd',
                                                            undefined,
                                                        );
                                                        setValue(
                                                            'shiftType',
                                                            undefined,
                                                        );
                                                    }
                                                }
                                            }}
                                            placeholder="Select Adjustment Type"
                                        />
                                    )}
                                />
                                {errors.adjustmentType && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.adjustmentType.message}
                                    </p>
                                )}
                            </div>

                            {watchedAdjustmentType === 'replace' && (
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Shift Type
                                        </span>
                                    </label>
                                    <Controller
                                        name="shiftType"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                {...setClassNameAndIsDisabled(
                                                    isOpen,
                                                )}
                                                options={shiftTypeOptions}
                                                closeMenuOnSelect={true}
                                                classNamePrefix="react-select"
                                                menuPortalTarget={
                                                    setMenuPortalTarget
                                                }
                                                menuPlacement="auto"
                                                menuPosition="fixed"
                                                styles={setCalculatedZIndex(
                                                    baseZIndex,
                                                )}
                                                value={
                                                    shiftTypeOptions.find(
                                                        opt =>
                                                            opt.value ===
                                                            field.value,
                                                    ) || null
                                                }
                                                onChange={opt => {
                                                    if (opt) {
                                                        const type = opt.value;
                                                        field.onChange(type);
                                                        if (type !== 'custom') {
                                                            const s =
                                                                STANDARD_SHIFTS[
                                                                    type as keyof typeof STANDARD_SHIFTS
                                                                ];
                                                            setValue(
                                                                'shiftStart',
                                                                s.start,
                                                            );
                                                            setValue(
                                                                'shiftEnd',
                                                                s.end,
                                                            );
                                                        } else {
                                                            setValue(
                                                                'shiftStart',
                                                                undefined,
                                                            );
                                                            setValue(
                                                                'shiftEnd',
                                                                undefined,
                                                            );
                                                        }
                                                    }
                                                }}
                                                placeholder="Select Type"
                                            />
                                        )}
                                    />
                                    {errors.shiftType && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.shiftType.message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {watchedAdjustmentType === 'replace' && (
                                <>
                                    <div>
                                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                            <span className="uppercase">
                                                Start Time (HH:mm)
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register('shiftStart')}
                                            placeholder="09:00"
                                            disabled={
                                                watchedShiftType !== 'custom'
                                            }
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        />
                                        {errors.shiftStart && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.shiftStart.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                            <span className="uppercase">
                                                End Time (HH:mm)
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register('shiftEnd')}
                                            placeholder="17:00"
                                            disabled={
                                                watchedShiftType !== 'custom'
                                            }
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        />
                                        {errors.shiftEnd && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.shiftEnd.message}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {watchedAdjustmentType === 'replace' && (
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Grace Period (min)
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        {...register('gracePeriodMinutes', {
                                            valueAsNumber: true,
                                        })}
                                        min={0}
                                        max={120}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                    <p className="text-xs font-mono text-gray-400 flex flex-row gap-2 mt-1">
                                        Minutes allowed late before flagging as
                                        delayed
                                    </p>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <div className="flex flex-col">
                                    <label className="inline-flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('active')}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            Active Adjustment
                                        </span>
                                    </label>
                                    <p className="text-xs font-mono text-gray-400 flex flex-row gap-2 mt-0.5">
                                        Deactivate to stop using this adjustment
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Comment</span>
                            </label>
                            <textarea
                                {...register('comment')}
                                placeholder="Adjustment reason or details..."
                                rows={3}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                            {errors.comment && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.comment.message}
                                </p>
                            )}
                        </div>
                    </form>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={isSubmitting}
                        >
                            Close
                        </button>
                        <button
                            disabled={isSubmitting}
                            onClick={handleSubmit(onSubmit)}
                            className="rounded-md bg-blue-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default EditButton;
