'use client';

import { type ShiftType } from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { Trash2, X } from 'lucide-react';
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
    submitHandler: (scheduleId: string) => Promise<void>;
}

const DeleteScheduleButton: React.FC<PropsType> = ({
    loading,
    schedule,
    submitHandler,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);

    const onConfirm = async () => {
        await submitHandler(schedule._id);
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

    const getDateRangeLabel = (startStr: string, endStr: string) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete"
            >
                <Trash2 size={16} />
            </button>
            {isOpen && (
                <section
                    onClick={handleClickOutside}
                    className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors bg-black/20 disable-page-scroll`}
                >
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[50vw] lg:w-[35vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Delete Shift Assignment
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                type="button"
                                className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <div className="p-4 text-start space-y-4">
                            <p className="text-gray-700">
                                Are you sure you want to remove the shift
                                assignment for:
                            </p>
                            <div className="bg-gray-50 p-3 rounded-md">
                                <p className="text-sm text-gray-600">
                                    <strong>Employee:</strong>{' '}
                                    {schedule.employee.real_name} (
                                    {schedule.employee.e_id})
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Shift:</strong>{' '}
                                    <span className="capitalize">
                                        {schedule.shift_type}
                                    </span>{' '}
                                    ({schedule.shift?.start_time} -{' '}
                                    {schedule.shift?.end_time})
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Period:</strong>{' '}
                                    {getDateRangeLabel(
                                        schedule.start_date,
                                        schedule.end_date,
                                    )}
                                </p>
                            </div>
                            <p className="text-sm text-red-600">
                                This action cannot be undone.
                            </p>
                        </div>
                        <footer className="flex items-center px-4 py-2 border-t justify-end gap-4 border-gray-200 rounded-b">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition px-4 py-1"
                                type="button"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={loading}
                                onClick={onConfirm}
                                className={cn(
                                    'rounded-md bg-destructive text-white hover:opacity-90 hover:ring-2 hover:ring-destructive transition px-4 py-1',
                                    loading && 'opacity-50 cursor-not-allowed',
                                )}
                                type="button"
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </footer>
                    </article>
                </section>
            )}
        </>
    );
};

export default DeleteScheduleButton;
