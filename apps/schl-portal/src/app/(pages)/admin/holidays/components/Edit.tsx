'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Holiday } from '@repo/common/models/holiday.schema';
import { SquarePen, X } from 'lucide-react';
import moment from 'moment-timezone';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { HolidayData, holidaySchema } from '../schema';

interface HolidayWithId extends Omit<Holiday, 'flag'> {
    _id: string;
}

interface EditButtonProps {
    holiday: HolidayWithId;
    submitHandler: (id: string, data: HolidayData) => Promise<boolean>;
}

const baseZIndex = 50;

const EditButton: React.FC<EditButtonProps> = ({ holiday, submitHandler }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const fromDateString = holiday.dateFrom
        ? moment.tz(String(holiday.dateFrom), 'Asia/Dhaka').format('YYYY-MM-DD')
        : '';
    const toDateString = holiday.dateTo
        ? moment.tz(String(holiday.dateTo), 'Asia/Dhaka').format('YYYY-MM-DD')
        : '';

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<HolidayData>({
        resolver: zodResolver(holidaySchema),
        defaultValues: {
            name: holiday.name,
            dateFrom: fromDateString,
            dateTo: toDateString,
            comment: holiday.comment || '',
            active: holiday.active ?? true,
        },
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                name: holiday.name,
                dateFrom: fromDateString,
                dateTo: toDateString,
                comment: holiday.comment || '',
                active: holiday.active ?? true,
            });
        }
    }, [isOpen, holiday, reset, fromDateString, toDateString]);

    const onSubmit = async (data: HolidayData) => {
        const success = await submitHandler(holiday._id, data);
        if (success) {
            setIsOpen(false);
        }
    };

    const handleClickOutside = (e: React.MouseEvent<HTMLElement>) => {
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
                title="Edit Holiday"
            >
                <SquarePen size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'}`}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative lg:w-[45vw] md:w-[70vw] sm:w-[80vw]`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Edit Holiday
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <form
                        className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                        onSubmit={handleSubmit(onSubmit)}
                        autoComplete="off"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4 mb-4">
                            <div className="md:col-span-2">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Name*</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('name')}
                                    autoComplete="off"
                                    placeholder="e.g. Eid ul-Fitr"
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Start Date*
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    {...register('dateFrom')}
                                    min={new Date().toISOString().split('T')[0]}
                                    autoComplete="off"
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.dateFrom && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.dateFrom.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">End Date</span>
                                </label>
                                <input
                                    type="date"
                                    {...register('dateTo')}
                                    min={watch('dateFrom')}
                                    autoComplete="off"
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.dateTo && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.dateTo.message}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Comment</span>
                                </label>
                                <textarea
                                    {...register('comment')}
                                    autoComplete="off"
                                    rows={3}
                                    placeholder="Any notes about this holiday..."
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.comment && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.comment.message}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="active-edit"
                                    {...register('active')}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="active-edit"
                                    className="text-sm font-bold text-gray-700 uppercase"
                                >
                                    Active
                                </label>
                            </div>
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
