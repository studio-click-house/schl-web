'use client';

import { type ShiftType } from '@repo/common/constants/shift.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import {
    setCalculatedZIndex,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { UserPlus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { ShiftDataType } from './ScheduleTable';

const baseZIndex = 50;

interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface PropsType {
    loading: boolean;
    shifts: ShiftDataType[];
    employees: EmployeeDocument[];
    dateRange: DateRange;
    submitHandler: (
        employeeIds: string[],
        shiftId: string,
        shiftType: ShiftType,
        startDate: string,
        endDate: string,
    ) => Promise<void>;
}

type EmployeeOption = { value: string; label: string };

const AssignButton: React.FC<PropsType> = ({
    loading,
    shifts,
    employees,
    dateRange,
    submitHandler,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const canAssign = hasPerm('admin:manage_shifts', userPermissions);

    const [selectedShift, setSelectedShift] = useState<string>('');
    const [selectedEmployees, setSelectedEmployees] = useState<
        EmployeeOption[]
    >([]);
    const [assignStartDate, setAssignStartDate] = useState<Date>(
        dateRange.startDate,
    );
    const [assignEndDate, setAssignEndDate] = useState<Date>(
        dateRange.endDate,
    );

    const employeeOptions: EmployeeOption[] = useMemo(
        () =>
            employees.map(emp => ({
                value: emp._id.toString(),
                label: `${emp.real_name} (${emp.e_id}) - ${emp.department}`,
            })),
        [employees],
    );

    const shiftOptions = useMemo(
        () =>
            shifts
                .filter(s => s.is_active)
                .map(shift => ({
                    value: shift._id || '',
                    label: `${shift.name} (${shift.start_time} - ${shift.end_time})`,
                })),
        [shifts],
    );

    const resetForm = () => {
        setSelectedShift('');
        setSelectedEmployees([]);
        setAssignStartDate(dateRange.startDate);
        setAssignEndDate(dateRange.endDate);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canAssign || !selectedShift || selectedEmployees.length === 0)
            return;

        const shift = shifts.find(s => s._id === selectedShift);
        if (!shift) return;

        await submitHandler(
            selectedEmployees.map(e => e.value),
            selectedShift,
            shift.type,
            assignStartDate.toISOString(),
            assignEndDate.toISOString(),
        );
        resetForm();
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

    if (!canAssign) {
        return null;
    }

    const openModal = () => {
        setAssignStartDate(dateRange.startDate);
        setAssignEndDate(dateRange.endDate);
        setIsOpen(true);
    };

    const getDateRangeLabel = (start: Date, end: Date) => {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    return (
        <>
            <button
                onClick={openModal}
                className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
            >
                Assign Shifts
                <UserPlus size={18} />
            </button>
            {isOpen && (
                <section
                    onClick={handleClickOutside}
                    className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors bg-black/20 disable-page-scroll`}
                >
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[50vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Assign Shifts
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Start Date*
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={
                                            assignStartDate
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const date = new Date(e.target.value);
                                            setAssignStartDate(date);
                                            if (date > assignEndDate) {
                                                setAssignEndDate(date);
                                            }
                                        }}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            End Date*
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={
                                            assignEndDate
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            setAssignEndDate(
                                                new Date(e.target.value),
                                            );
                                        }}
                                        min={
                                            assignStartDate
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-md text-center text-sm text-blue-700">
                                Period:{' '}
                                {getDateRangeLabel(
                                    assignStartDate,
                                    assignEndDate,
                                )}{' '}
                                (
                                {Math.ceil(
                                    (assignEndDate.getTime() -
                                        assignStartDate.getTime()) /
                                        (1000 * 60 * 60 * 24),
                                ) + 1}{' '}
                                days)
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
                                    <span className="uppercase">
                                        Select Employees*
                                    </span>
                                </label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={employeeOptions}
                                    value={selectedEmployees}
                                    onChange={selected =>
                                        setSelectedEmployees(
                                            selected as EmployeeOption[],
                                        )
                                    }
                                    placeholder="Search and select employees..."
                                    classNamePrefix="react-select"
                                    closeMenuOnSelect={false}
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(baseZIndex)}
                                />
                            </div>
                            <div className="text-sm text-gray-500">
                                <p>
                                    Selected: {selectedEmployees.length}{' '}
                                    employee(s)
                                </p>
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
                                disabled={
                                    loading ||
                                    !selectedShift ||
                                    !assignStartDate ||
                                    !assignEndDate ||
                                    selectedEmployees.length === 0
                                }
                                onClick={() => formRef.current?.requestSubmit()}
                                className={cn(
                                    'rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition px-4 py-1',
                                    (loading ||
                                        !selectedShift ||
                                        !assignStartDate ||
                                        !assignEndDate ||
                                        selectedEmployees.length === 0) &&
                                        'opacity-50 cursor-not-allowed',
                                )}
                                type="button"
                            >
                                {loading ? 'Assigning...' : 'Assign'}
                            </button>
                        </footer>
                    </article>
                </section>
            )}
        </>
    );
};

export default AssignButton;
