'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@repo/common/utils/general-utils';
import { CirclePlus, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { HolidayData, holidaySchema } from '../schema';

interface CreateButtonProps {
    className?: string;
    submitHandler: (data: HolidayData) => Promise<boolean>;
}

const baseZIndex = 50;

const CreateButton: React.FC<CreateButtonProps> = ({
    submitHandler,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<HolidayData>({
        resolver: zodResolver(holidaySchema),
        defaultValues: {
            name: '',
            dateFrom: '',
            dateTo: '',
            comment: '',
        },
    });

    const onSubmit = async (data: HolidayData) => {
        const success = await submitHandler(data);
        if (success) {
            reset();
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
                className={cn(
                    'flex items-center justify-between gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2',
                    className,
                )}
            >
                Add Holiday
                <CirclePlus size={18} />
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
                            Add Holiday
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
                        </div>
                    </form>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setIsOpen(false);
                            }}
                            disabled={isSubmitting}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Holiday'}
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default CreateButton;
