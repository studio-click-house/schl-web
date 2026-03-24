'use client';

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

interface FilterProps {
    loading: boolean;
    submitHandler: () => void;
    setFilters: (filters: any) => void;
    filters: {
        employeeId: string;
        fromDate: string;
        toDate: string;
        active: string;
    };
    employeeOptions: { value: string; label: string }[];
    className?: string;
}

const FilterButton = ({
    loading,
    submitHandler,
    setFilters,
    filters,
    employeeOptions,
    className = '',
}: FilterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const handleClearFilters = () => {
        setFilters({
            employeeId: '',
            fromDate: '',
            toDate: '',
            active: 'true',
        });
        submitHandler();
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value } = e.target;
        setFilters((prevData: any) => ({
            ...prevData,
            [name]: value,
        }));
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
                type="button"
                disabled={loading}
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
                            Filter Adjustments
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
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

                            <div className="md:col-span-1">
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Employee
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={employeeOptions || []}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    menuPlacement="auto"
                                    menuPosition="fixed"
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        (employeeOptions || []).find(
                                            opt =>
                                                opt.value ===
                                                filters.employeeId,
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters((prev: any) => ({
                                            ...prev,
                                            employeeId: opt ? opt.value : '',
                                        }))
                                    }
                                    placeholder="All Employees"
                                    isClearable
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Status
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={[
                                        { value: 'true', label: 'Active' },
                                        {
                                            value: 'false',
                                            label: 'Deactivated',
                                        },
                                    ]}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    menuPlacement="auto"
                                    menuPosition="fixed"
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        [
                                            { value: 'true', label: 'Active' },
                                            {
                                                value: 'false',
                                                label: 'Inactive',
                                            },
                                        ].find(
                                            opt => opt.value === filters.active,
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters((prev: any) => ({
                                            ...prev,
                                            active: opt ? opt.value : '',
                                        }))
                                    }
                                    placeholder="All Status"
                                    isClearable
                                />
                            </div>
                        </div>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={handleClearFilters}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                            disabled={loading}
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => {
                                submitHandler();
                                setIsOpen(false);
                            }}
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
