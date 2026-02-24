'use client';

import {
    statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import { cn } from '@repo/common/utils/general-utils';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { Filter, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import Select from 'react-select';

const baseZIndex = 50;

interface PropsType {
    className?: string;
    submitHandler: () => void;
    filters: {
        ticketNumber: string;
        title: string;
        type: string;
        status: string;
        fromDate: string;
        toDate: string;
    };
    setFilters: React.Dispatch<
        React.SetStateAction<{
            ticketNumber: string;
            title: string;
            type: string;
            status: string;
            fromDate: string;
            toDate: string;
        }>
    >;
    isLoading: boolean;
}

export default function FilterButton(props: PropsType) {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement | null>(null);
    const { filters, setFilters } = props;

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }) as any);
    };

    const handleResetFilters = () => {
        setFilters({
            ticketNumber: '',
            title: '',
            type: '',
            status: '',
            fromDate: '',
            toDate: '',
        });
    };

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector('input:focus, textarea:focus')
        ) {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className={cn(
                    `flex items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2`,
                    props.className,
                )}
            >
                Filter
                <Filter size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'}`}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg lg:w-[35vw] md:w-[70vw] sm:w-[80vw] shadow relative`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Filter Tickets
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center "
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div className="overflow-y-scroll max-h-[70vh] p-4">
                        <div className="grid grid-cols-1 gap-x-3 gap-y-4 md:grid-cols-2">
                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Ticket Number
                                </label>
                                <input
                                    autoComplete="off"
                                    name="ticketNumber"
                                    value={filters.ticketNumber}
                                    onChange={handleChange}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    type="text"
                                    placeholder="Search by ticket number"
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Title
                                </label>
                                <input
                                    autoComplete="off"
                                    name="title"
                                    value={filters.title}
                                    onChange={handleChange}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    type="text"
                                    placeholder="Search by title"
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Type
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={typeOptions}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        typeOptions.find(
                                            o => o.value === props.filters.type,
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters(prev => ({
                                            ...prev,
                                            type: opt?.value || '',
                                        }))
                                    }
                                    isClearable
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Status
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={statusOptions}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        statusOptions.find(
                                            o =>
                                                o.value ===
                                                props.filters.status,
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters(prev => ({
                                            ...prev,
                                            status: opt?.value || '',
                                        }))
                                    }
                                    isClearable
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Date Picker
                                </label>

                                <div
                                    className="inline-flex w-full"
                                    role="group"
                                >
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-s-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        name="fromDate"
                                        value={filters.fromDate}
                                        onChange={handleChange}
                                        type="date"
                                    />
                                    <span className="inline-flex items-center px-4 py-2 m-0 text-sm font-medium border">
                                        <b>to</b>
                                    </span>
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-e-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        name="toDate"
                                        value={filters.toDate}
                                        onChange={handleChange}
                                        type="date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={handleResetFilters}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                            type="button"
                            disabled={props.isLoading}
                        >
                            Reset
                        </button>
                        <button
                            onClick={props.submitHandler}
                            className="rounded-md bg-blue-600 text-white   hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                            type="button"
                            disabled={props.isLoading}
                        >
                            Search
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
}
