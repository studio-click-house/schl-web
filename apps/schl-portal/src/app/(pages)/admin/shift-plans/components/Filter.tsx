'use client';

import { cn } from '@repo/common/utils/general-utils';
import { EMPLOYEE_DEPARTMENTS } from '@repo/common/constants/employee.constant';
import { Filter, X } from 'lucide-react';
import moment from 'moment-timezone';
import React, { useRef, useState } from 'react';
import Select from 'react-select';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';

const departmentOptions = EMPLOYEE_DEPARTMENTS.map(dept => ({
    value: dept,
    label: dept,
}));

const shiftTypeOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'evening', label: 'Evening' },
    { value: 'night', label: 'Night' },
    { value: 'custom', label: 'Custom' },
];

const activeOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
];

const baseZIndex = 50;

interface FilterProps {
    loading: boolean;
    submitHandler: () => void;
    setFilters: (filters: any) => void;
    filters: any;
    className?: string;
}

const FilterButton = ({
    loading,
    submitHandler,
    setFilters,
    filters,
    className = '',
}: FilterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const handleClearFilters = () => {
        const today = moment.tz('Asia/Dhaka');
        const monday = today.clone().startOf('isoWeek').format('YYYY-MM-DD');
        const sunday = today.clone().endOf('isoWeek').format('YYYY-MM-DD');

        setFilters({
            employeeId: '',
            fromDate: monday,
            toDate: sunday,
            shiftType: '',
            active: 'true',
            department: '',
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
                            Filter Shift Plans
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

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Department
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={departmentOptions}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    menuPlacement="auto"
                                    menuPosition="fixed"
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        departmentOptions.find(
                                            opt => opt.value === filters.department
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters((prev: any) => ({
                                            ...prev,
                                            department: opt ? opt.value : '',
                                        }))
                                    }
                                    placeholder="All Departments"
                                    isClearable
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Shift Type
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={shiftTypeOptions}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    menuPlacement="auto"
                                    menuPosition="fixed"
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        shiftTypeOptions.find(
                                            opt => opt.value === filters.shiftType
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters((prev: any) => ({
                                            ...prev,
                                            shiftType: opt ? opt.value : '',
                                        }))
                                    }
                                    placeholder="All Types"
                                    isClearable
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2">
                                    Active
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={activeOptions}
                                    closeMenuOnSelect={true}
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    menuPlacement="auto"
                                    menuPosition="fixed"
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={
                                        activeOptions.find(
                                            opt => opt.value === filters.active
                                        ) || null
                                    }
                                    onChange={opt =>
                                        setFilters((prev: any) => ({
                                            ...prev,
                                            active: opt ? opt.value : '',
                                        }))
                                    }
                                    placeholder="All"
                                    isClearable
                                />
                            </div>
                        </div>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={handleClearFilters}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
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
                            className="rounded-md bg-blue-600 text-white   hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
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
