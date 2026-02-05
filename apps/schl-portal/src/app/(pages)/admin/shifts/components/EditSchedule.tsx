'use client';

import { type ShiftType } from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { Pencil, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { ShiftDataType } from './ScheduleTable';

const baseZIndex = 50;

interface ShiftSchedule {
    _id: string;
    employee: {
        _id: string;
        e_id: string;
        real_name: string;
        designation: string;
        department: string;
    };
    shift: ShiftDataType;
    shift_type: ShiftType;
    start_date: string;
    end_date: string;
    notes: string;
}

interface PropsType {
    loading: boolean;
    schedule: ShiftSchedule;
    shifts: ShiftDataType[];
    submitHandler: (
        employeeId: string,
        shiftId: string,
        shiftType: ShiftType,
        startDate: string,
        endDate: string,
        notes?: string,
    ) => Promise<void>;
}

const EditScheduleButton: React.FC<PropsType> = ({
    loading,
    schedule,
    shifts,
    submitHandler,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const [selectedShift, setSelectedShift] = useState<string>(
        schedule.shift?._id || '',
    );
    const [notes, setNotes] = useState<string>(schedule.notes || '');

    const shiftOptions = shifts
        .filter(s => s.is_active)
        .map(shift => ({
            value: shift._id || '',
            label: `${shift.name} (${shift.start_time} - ${shift.end_time})`,
            type: shift.type,
        }));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShift) return;

        const shift = shifts.find(s => s._id === selectedShift);
        if (!shift) return;

        await submitHandler(
            schedule.employee._id,
            selectedShift,
            shift.type,
            schedule.start_date,
            schedule.end_date,
            notes,
        );
        setIsOpen(false);
    };

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

    const openModal = () => {
        setSelectedShift(schedule.shift?._id || '');
        setNotes(schedule.notes || '');
        setIsOpen(true);
    };

    const getDateRangeLabel = (startStr: string, endStr: string) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    return (
        <>
            <button
                onClick={openModal}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Edit"
            >
                <Pencil size={16} />
            </button>
            {isOpen && (
                <section
                    onClick={handleClickOutside}
                    className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors bg-black/20 disable-page-scroll`}
                >
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Edit Shift Assignment
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                type="button"
                                className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <form
                            ref={formRef}
                            onSubmit={onSubmit}
                            className="overflow-x-hidden overflow-y-auto max-h-[70vh] p-4 text-start space-y-4"
                        >
                            <div className="bg-gray-50 p-3 rounded-md">
                                <p className="text-sm text-gray-600">
                                    <strong>Employee:</strong>{' '}
                                    {schedule.employee.real_name} (
                                    {schedule.employee.e_id})
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Period:</strong>{' '}
                                    {getDateRangeLabel(
                                        schedule.start_date,
                                        schedule.end_date,
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Select Shift*
                                    </span>
                                </label>
                                <select
                                    value={selectedShift}
                                    onChange={e =>
                                        setSelectedShift(e.target.value)
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    required
                                >
                                    <option value="">
                                        -- Select a shift --
                                    </option>
                                    {shiftOptions.map(opt => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Notes</span>
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </form>
                        <footer className="flex items-center px-4 py-2 border-t justify-end gap-4 border-gray-200 rounded-b">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition px-4 py-1"
                                type="button"
                                disabled={loading}
                            >
                                Close
                            </button>
                            <button
                                disabled={loading || !selectedShift}
                                onClick={() => formRef.current?.requestSubmit()}
                                className={cn(
                                    'rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition px-4 py-1',
                                    (loading || !selectedShift) &&
                                        'opacity-50 cursor-not-allowed',
                                )}
                                type="button"
                            >
                                {loading ? 'Updating...' : 'Update'}
                            </button>
                        </footer>
                    </article>
                </section>
            )}
        </>
    );
};

export default EditScheduleButton;
