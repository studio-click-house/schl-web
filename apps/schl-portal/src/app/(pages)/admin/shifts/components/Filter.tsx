'use client';

import {
    SHIFT_TYPES,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { Filter, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

const baseZIndex = 50;

interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface FiltersType {
    shiftType: ShiftType | '';
    dateRange: DateRange;
}

interface PropsType {
    loading: boolean;
    filters: FiltersType;
    setFilters: React.Dispatch<React.SetStateAction<FiltersType>>;
    className?: string;
}

const FilterButton: React.FC<PropsType> = ({
    loading,
    filters,
    setFilters,
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
        setIsOpen(false);
    };

    const handleClear = () => {
        const now = new Date();
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - now.getDay());
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);

        const cleared: FiltersType = {
            shiftType: '',
            dateRange: { startDate: sunday, endDate: saturday },
        };
        setLocalFilters(cleared);
        setFilters(cleared);
        setIsOpen(false);
    };

    const formatDateForInput = (date: Date | null) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    const getFilterSummary = () => {
        const parts: string[] = [];
        if (filters.dateRange.startDate && filters.dateRange.endDate) {
            const start = filters.dateRange.startDate.toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' },
            );
            const end = filters.dateRange.endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
            parts.push(`${start} - ${end}`);
        }
        if (filters.shiftType) {
            parts.push(
                filters.shiftType.charAt(0).toUpperCase() +
                    filters.shiftType.slice(1),
            );
        }
        return parts.length > 0 ? parts.join(' | ') : 'Filter';
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
                {getFilterSummary()}
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
                                Filter Schedules
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            From Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(
                                            localFilters.dateRange.startDate,
                                        )}
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const date = new Date(e.target.value);
                                            setLocalFilters(prev => ({
                                                ...prev,
                                                dateRange: {
                                                    ...prev.dateRange,
                                                    startDate: date,
                                                },
                                            }));
                                        }}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            To Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(
                                            localFilters.dateRange.endDate,
                                        )}
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const date = new Date(e.target.value);
                                            setLocalFilters(prev => ({
                                                ...prev,
                                                dateRange: {
                                                    ...prev.dateRange,
                                                    endDate: date,
                                                },
                                            }));
                                        }}
                                        min={formatDateForInput(
                                            localFilters.dateRange.startDate,
                                        )}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Shift Type
                                    </span>
                                </label>
                                <select
                                    value={localFilters.shiftType}
                                    onChange={e =>
                                        setLocalFilters({
                                            ...localFilters,
                                            shiftType: e.target.value as
                                                | ShiftType
                                                | '',
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                >
                                    <option value="">All Shifts</option>
                                    {SHIFT_TYPES.map(type => (
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

export type { DateRange, FiltersType };
