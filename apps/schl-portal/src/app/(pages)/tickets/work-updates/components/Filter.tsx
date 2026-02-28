'use client';

import { cn } from '@repo/common/utils/general-utils';
import { Filter, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
    filters: {
        fromDate: string;
        toDate: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<any>>;
    submitHandler: () => void;
    className?: string;
    loading?: boolean;
}

const baseZIndex = 50;

const FilterButton: React.FC<Props> = props => {
    const [isOpen, setIsOpen] = useState(false);
    const { filters, setFilters, submitHandler, loading } = props;
    const [tempFilters, setTempFilters] = useState(filters);
    const popupRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTempFilters(filters);
        }
    }, [isOpen, filters]);

    const handleResetFilters = () => {
        const today = new Date().toISOString().substring(0, 10);
        setTempFilters({
            fromDate: today,
            toDate: today,
        });
    };

    const handleApply = () => {
        setFilters(tempFilters);
        setIsOpen(false);
        setTimeout(submitHandler, 0);
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
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${
                    isOpen
                        ? 'visible bg-black/20 disable-page-scroll pointer-events-auto'
                        : 'invisible pointer-events-none'
                }`}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg lg:w-[35vw] md:w-[70vw] sm:w-[80vw] shadow relative`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Filter Updates
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
                        <div className="grid grid-cols-1 gap-x-3 gap-y-4 mb-4">
                            <div>
                                <label className="block uppercase tracking-wide text-gray-700 text-sm font-bold mb-2">
                                    Date Range
                                </label>
                                <div className="inline-flex w-full" role="group">
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-s-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        value={tempFilters.fromDate}
                                        onChange={e =>
                                            setTempFilters(prev => ({
                                                ...prev,
                                                fromDate: e.target.value,
                                            }))
                                        }
                                        type="date"
                                    />
                                    <span className="inline-flex items-center px-4 py-2 m-0 text-sm font-medium border bg-gray-100">
                                        <b>to</b>
                                    </span>
                                    <input
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-e-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        value={tempFilters.toDate}
                                        onChange={e =>
                                            setTempFilters(prev => ({
                                                ...prev,
                                                toDate: e.target.value,
                                            }))
                                        }
                                        type="date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={handleResetFilters}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={loading}
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleApply}
                            className="rounded-md bg-blue-600 text-white   hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={loading}
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
