'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShiftPlan } from '@repo/common/models/shift-plan.schema';
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
import {
    STANDARD_SHIFTS,
    ShiftPlanEditData,
    shiftPlanEditSchema,
} from '../schema';

const shiftTypeOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'evening', label: 'Evening' },
    { value: 'night', label: 'Night' },
    { value: 'custom', label: 'Custom' },
] as const;

const baseZIndex = 50;

interface ShiftPlanWithId extends ShiftPlan {
    _id: string;
}

interface EditButtonProps {
    shiftPlan: ShiftPlanWithId;
    submitHandler: () => void;
}

const EditButton = ({ shiftPlan, submitHandler }: EditButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const authedFetchApi = useAuthedFetchApi();
    const popupRef = useRef<HTMLElement>(null);

    const fromDateString = shiftPlan.effective_from
        ? moment.tz(shiftPlan.effective_from, 'Asia/Dhaka').format('YYYY-MM-DD')
        : '';
    const toDateString = shiftPlan.effective_to
        ? moment.tz(shiftPlan.effective_to, 'Asia/Dhaka').format('YYYY-MM-DD')
        : '';

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ShiftPlanEditData>({
        resolver: zodResolver(shiftPlanEditSchema),
        defaultValues: {
            fromDate: fromDateString || '',
            toDate: toDateString || '',
            shiftType: shiftPlan.shift_type,
            shiftStart: shiftPlan.shift_start,
            shiftEnd: shiftPlan.shift_end,
            active: shiftPlan.active,
            gracePeriodMinutes: shiftPlan.grace_period_minutes ?? 10,
            comment: shiftPlan.comment || '',
        },
    });

    const watchedShiftType = watch('shiftType');

    useEffect(() => {
        if (isOpen) {
            reset({
                fromDate: fromDateString,
                toDate: toDateString,
                shiftType: shiftPlan.shift_type,
                shiftStart: shiftPlan.shift_start,
                shiftEnd: shiftPlan.shift_end,
                active: shiftPlan.active,
                gracePeriodMinutes: shiftPlan.grace_period_minutes ?? 10,
                comment: shiftPlan.comment || '',
            });
        }
    }, [isOpen, shiftPlan, reset, fromDateString, toDateString]);

    const onSubmit = async (data: ShiftPlanEditData) => {
        try {
            const response = await authedFetchApi<ShiftPlan>(
                { path: `/v1/shift-plan/${shiftPlan._id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (response.ok) {
                toast.success('Shift plan updated successfully');
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
                            Edit Shift Template
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
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">From Date</span>
                                </label>
                                <input
                                    type="date"
                                    {...register('fromDate')}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.fromDate && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.fromDate.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">To Date</span>
                                </label>
                                <input
                                    type="date"
                                    {...register('toDate')}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.toDate && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.toDate.message}
                                    </p>
                                )}
                            </div>

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
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
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
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.shiftEnd && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.shiftEnd.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="inline-flex items-center gap-2 cursor-pointer md:mt-7">
                                    <input
                                        type="checkbox"
                                        {...register('active')}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Active Template
                                    </span>
                                </label>
                                <p className="text-xs font-mono text-gray-400 flex flex-row gap-2 mt-0.5">
                                    Deactivate to stop using this template for
                                    new days
                                </p>
                            </div>

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
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Comment</span>
                            </label>
                            <textarea
                                {...register('comment')}
                                placeholder="e.g., Week 2, 3, 4..."
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
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default EditButton;
