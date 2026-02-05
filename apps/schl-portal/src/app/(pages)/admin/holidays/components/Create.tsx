'use client';

import {
    HALF_DAY_PERIODS,
    HOLIDAY_TARGET_TYPES,
    HOLIDAY_TYPES,
    LEAVE_PAYMENT_TYPES,
    SHIFT_TYPES,
    type HalfDayPeriod,
    type HolidayTargetType,
    type HolidayType,
    type LeavePaymentType,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import {
    setCalculatedZIndex,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { CirclePlus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { HolidayDataType } from './Table';

const baseZIndex = 50;

interface PropsType {
    loading: boolean;
    employees: EmployeeDocument[];
    submitHandler: (holidayData: HolidayDataType) => Promise<void>;
}

type EmployeeOption = { value: string; label: string };

const CreateButton: React.FC<PropsType> = ({
    loading,
    employees,
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
    const canCreate = hasPerm('admin:manage_holidays', userPermissions);

    const [formData, setFormData] = useState<HolidayDataType>({
        title: '',
        description: '',
        holiday_type: 'full_day',
        half_day_period: null,
        payment_type: 'paid',
        start_date: '',
        end_date: '',
        target_type: 'all',
        target_shift: null,
        target_employees: [],
        is_active: true,
    });

    const [selectedEmployees, setSelectedEmployees] = useState<
        EmployeeOption[]
    >([]);

    const employeeOptions: EmployeeOption[] = useMemo(
        () =>
            employees.map(emp => ({
                value: emp._id.toString(),
                label: `${emp.real_name} (${emp.e_id})`,
            })),
        [employees],
    );

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            holiday_type: 'full_day',
            half_day_period: null,
            payment_type: 'paid',
            start_date: '',
            end_date: '',
            target_type: 'all',
            target_shift: null,
            target_employees: [],
            is_active: true,
        });
        setSelectedEmployees([]);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreate) return;

        const dataToSubmit = {
            ...formData,
            half_day_period:
                formData.holiday_type === 'half_day'
                    ? formData.half_day_period
                    : null,
            target_shift:
                formData.target_type === 'shift' ? formData.target_shift : null,
            target_employees:
                formData.target_type === 'individual'
                    ? selectedEmployees.map(e => e.value)
                    : [],
        };

        await submitHandler(dataToSubmit);
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

    if (!canCreate) {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
            >
                Add new holiday
                <CirclePlus size={18} />
            </button>
            {isOpen && (
                <section
                    onClick={handleClickOutside}
                    className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors bg-black/20 disable-page-scroll`}
                >
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[70vw] lg:w-[50vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Create New Holiday / Leave
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
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Title*</span>
                                </label>
                                <input
                                    value={formData.title}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            title: e.target.value,
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="e.g., National Holiday, Company Leave"
                                    required
                                />
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Description
                                    </span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    rows={2}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="Optional details about this holiday"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Holiday Type*
                                        </span>
                                    </label>
                                    <select
                                        value={formData.holiday_type}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                holiday_type: e.target
                                                    .value as HolidayType,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    >
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
                                            Payment Type*
                                        </span>
                                    </label>
                                    <select
                                        value={formData.payment_type}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                payment_type: e.target
                                                    .value as LeavePaymentType,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    >
                                        {LEAVE_PAYMENT_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() +
                                                    type.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {formData.holiday_type === 'half_day' && (
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Half Day Period
                                        </span>
                                    </label>
                                    <select
                                        value={formData.half_day_period || ''}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                half_day_period: e.target
                                                    .value as HalfDayPeriod,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    >
                                        {HALF_DAY_PERIODS.map(period => (
                                            <option key={period} value={period}>
                                                {period
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
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Start Date*
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                start_date: e.target.value,
                                            })
                                        }
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
                                        value={formData.end_date}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                end_date: e.target.value,
                                            })
                                        }
                                        min={formData.start_date}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Apply To*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {HOLIDAY_TARGET_TYPES.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() =>
                                                setFormData({
                                                    ...formData,
                                                    target_type: type,
                                                })
                                            }
                                            className={cn(
                                                'px-4 py-2 border rounded-md transition',
                                                formData.target_type === type
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-white hover:bg-gray-50',
                                            )}
                                        >
                                            {type === 'all'
                                                ? 'All Employees'
                                                : type === 'shift'
                                                  ? 'By Shift'
                                                  : 'Individual'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {formData.target_type === 'shift' && (
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Select Shift
                                        </span>
                                    </label>
                                    <select
                                        value={formData.target_shift || ''}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                target_shift: e.target
                                                    .value as ShiftType,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    >
                                        <option value="">
                                            -- Select a shift --
                                        </option>
                                        {SHIFT_TYPES.map(shift => (
                                            <option key={shift} value={shift}>
                                                {shift.charAt(0).toUpperCase() +
                                                    shift.slice(1)}{' '}
                                                Shift
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {formData.target_type === 'individual' && (
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Select Employees
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
                            )}
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
                                disabled={loading}
                                onClick={() => formRef.current?.requestSubmit()}
                                className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition px-4 py-1"
                                type="button"
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </footer>
                    </article>
                </section>
            )}
        </>
    );
};

export default CreateButton;
