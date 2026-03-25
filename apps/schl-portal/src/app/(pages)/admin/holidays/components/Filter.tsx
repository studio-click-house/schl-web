'use client';

import { cn } from '@repo/common/utils/general-utils';
import { Filter, X } from 'lucide-react';
import moment from 'moment-timezone';
import React, { useRef, useState } from 'react';

interface PropsType {
    className?: string;
    submitHandler: (overrideFilters?: any) => void;
    filters: {
        fromDate: string;
        toDate: string;
        name: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<any>>;
    loading: boolean;
}

const baseZIndex = 50;

const FilterButton: React.FC<PropsType> = props => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { filters, setFilters } = props;
    const popupRef = useRef<HTMLElement>(null);
    const [localFilters, setLocalFilters] = useState(filters);

    // When popup opens, initialize local copy from parent
    React.useEffect(() => {
        if (isOpen) setLocalFilters(filters);
    }, [isOpen, filters]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        const today = moment.tz('Asia/Dhaka');
        const startOfYear = today.clone().startOf('year').format('YYYY-MM-DD');
        const endOfYear = today.clone().endOf('year').format('YYYY-MM-DD');
        const reset = {
            name: '',
            fromDate: startOfYear,
            toDate: endOfYear,
        };
        setLocalFilters(reset);
        setFilters(reset);
        props.submitHandler(reset);
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
                disabled={props.loading}
                className={cn(
                    `flex items-center justify-between gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2`,
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
                            Filter Holidays
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div className="p-4">
                        <div className="grid grid-cols-1 gap-x-3 gap-y-4">
                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Name
                                </label>
                                <input
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    name="name"
                                    value={localFilters.name}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="Search by name"
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Date Range
                                </label>
                                <div
                                    className="inline-flex w-full"
                                    role="group"
                                >
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-s-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        name="fromDate"
                                        value={localFilters.fromDate}
                                        onChange={handleChange}
                                        type="date"
                                    />
                                    <span className="inline-flex items-center px-4 py-2 m-0 text-sm font-medium border">
                                        <b>to</b>
                                    </span>
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-e-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        name="toDate"
                                        value={localFilters.toDate}
                                        onChange={handleChange}
                                        type="date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={() => {
                                handleResetFilters();
                                setIsOpen(false);
                            }}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={props.loading}
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => {
                                setFilters(localFilters);
                                props.submitHandler(localFilters);
                                setIsOpen(false);
                            }}
                            className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={props.loading}
                        >
                            Search
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default FilterButton;
