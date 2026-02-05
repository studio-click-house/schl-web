'use client';

import {
    HOLIDAY_TARGET_TYPES,
    HOLIDAY_TYPES,
    type HolidayTargetType,
    type HolidayType,
} from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { Filter, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

const baseZIndex = 50;

interface FiltersType {
    holidayType: HolidayType | '';
    targetType: HolidayTargetType | '';
}

interface PropsType {
    loading: boolean;
    filters: FiltersType;
    setFilters: React.Dispatch<React.SetStateAction<FiltersType>>;
    submitHandler: () => void;
    className?: string;
}

const FilterButton: React.FC<PropsType> = ({
    loading,
    filters,
    setFilters,
    submitHandler,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const [localFilters, setLocalFilters] = useState<FiltersType>({
        ...filters,
    });

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector(
                'input:focus, textarea:focus, button:focus, select:focus',
            )
        ) {
            setIsOpen(false);
        }
    };

    const handleApply = () => {
        setFilters(localFilters);
        submitHandler();
        setIsOpen(false);
    };

    const handleClear = () => {
        const cleared = {
            holidayType: '' as const,
            targetType: '' as const,
        };
        setLocalFilters(cleared);
        setFilters(cleared);
        submitHandler();
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => {
                    setLocalFilters({ ...filters });
                    setIsOpen(true);
                }}
                className={cn(
                    'flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2',
                    className,
                )}
                type="button"
            >
                Filter
                <Filter size={18} />
            </button>
            {isOpen && (
                <section
                    onClick={handleClickOutside}
                    className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors bg-black/20 disable-page-scroll`}
                >
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[30vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Filter Holidays
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                type="button"
                                className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <div className="overflow-x-hidden overflow-y-auto max-h-[70vh] p-4 text-start space-y-4">
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Holiday Type
                                    </span>
                                </label>
                                <select
                                    value={localFilters.holidayType}
                                    onChange={e =>
                                        setLocalFilters({
                                            ...localFilters,
                                            holidayType: e.target.value as
                                                | HolidayType
                                                | '',
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                >
                                    <option value="">All Types</option>
                                    {HOLIDAY_TYPES.map(type => (
                                        <option key={type} value={type}>
                                            {type
                                                .split('_')
                                                .map(
                                                    w =>
                                                        w
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                        w.slice(1),
                                                )
                                                .join(' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Target Type
                                    </span>
                                </label>
                                <select
                                    value={localFilters.targetType}
                                    onChange={e =>
                                        setLocalFilters({
                                            ...localFilters,
                                            targetType: e.target.value as
                                                | HolidayTargetType
                                                | '',
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                >
                                    <option value="">All Targets</option>
                                    {HOLIDAY_TARGET_TYPES.map(type => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() +
                                                type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <footer className="flex items-center px-4 py-2 border-t justify-end gap-4 border-gray-200 rounded-b">
                            <button
                                onClick={handleClear}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition px-4 py-1"
                                type="button"
                                disabled={loading}
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={loading}
                                className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition px-4 py-1"
                                type="button"
                            >
                                Apply
                            </button>
                        </footer>
                    </article>
                </section>
            )}
        </>
    );
};

export default FilterButton;
