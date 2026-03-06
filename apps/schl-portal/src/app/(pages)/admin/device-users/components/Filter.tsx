'use client';

import { cn } from '@repo/common/utils/general-utils';
import { Filter, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

const baseZIndex = 50;

interface FilterButtonProps {
    submitHandler: () => void | Promise<void>;
    setFilters: (filters: { searchString: string }) => void;
    filters: { searchString: string };
    loading: boolean;
    className?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
    submitHandler,
    setFilters,
    filters,
    loading,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchString, setSearchString] = useState(filters.searchString);
    const popupRef = useRef<HTMLElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchString(e.target.value);
    };

    const handleResetFilters = () => {
        setSearchString('');
        setFilters({ searchString: '' });
    };

    const handleApplyFilters = async () => {
        setFilters({ searchString });
        await submitHandler();
        setIsOpen(false);
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
                    className,
                )}
            >
                Filter
                <Filter size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'} `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg lg:w-[35vw] md:w-[70vw] sm:w-[80vw] shadow relative`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Filter Device Users
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>
                    <div className="overflow-y-scroll max-h-[70vh] p-4">
                        <div className="w-full">
                            <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                String Search
                            </label>

                            <input
                                placeholder="Search for any text"
                                name="searchString"
                                value={searchString}
                                onChange={handleChange}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            />
                        </div>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={handleResetFilters}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={loading}
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
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
