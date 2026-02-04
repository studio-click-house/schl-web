'use client';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn } from '@repo/common/utils/general-utils';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { SquarePen, X } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { toast } from 'sonner';
import { validationSchema, type DeviceUserDataType } from '../schema';

const baseZIndex = 50;

interface EditButtonProps {
    deviceUserData: any;
    employeesData: EmployeeDocument[];
    submitHandler: (
        deviceUserData: Partial<DeviceUserDataType>,
    ) => Promise<void>;
    loading: boolean;
}

const EditButton: React.FC<EditButtonProps> = ({
    deviceUserData,
    employeesData,
    submitHandler,
    loading,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Get the employee ObjectId - handle both populated and unpopulated cases
    const getEmployeeId = () => {
        if (typeof deviceUserData.employee === 'string') {
            return deviceUserData.employee;
        }
        return deviceUserData.employee?._id?.toString() || '';
    };

    const [editedData, setEditedData] = useState<Partial<DeviceUserDataType>>({
        card_number: deviceUserData.card_number,
        comment: deviceUserData.comment,
        employee: getEmployeeId(),
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const employeeOptions = useMemo(
        () =>
            (employeesData || []).map(employee => ({
                value: employee._id.toString(),
                label: `${employee.real_name} (${employee.e_id})`,
            })),
        [employeesData],
    );

    const selectedEmployee = useMemo(
        () => employeeOptions.find(opt => opt.value === editedData.employee),
        [employeeOptions, editedData.employee],
    );

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector('input:focus, textarea:focus') &&
            !popupRef.current.querySelector('button:focus')
        ) {
            setIsOpen(false);
        }
    };

    const handleChange = (
        field: keyof Partial<DeviceUserDataType>,
        value: any,
    ) => {
        setEditedData(prev => ({
            ...prev,
            [field]: value,
        }));
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: '',
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            const dataToValidate = {
                user_id: deviceUserData.user_id,
                employee: editedData.employee,
                card_number: editedData.card_number,
                comment: editedData.comment,
                _id: deviceUserData._id?.toString(),
            };

            const parsed = validationSchema.safeParse(dataToValidate);

            if (!parsed.success) {
                const newErrors: Record<string, string> = {};
                parsed.error.issues.forEach(issue => {
                    const path = issue.path[0] as string;
                    newErrors[path] = issue.message;
                });
                setErrors(newErrors);
                toast.error('Please fix the errors in the form');
                return;
            }

            await submitHandler({
                _id: deviceUserData._id,
                employeeId: parsed.data.employee,
                cardNumber: parsed.data.card_number,
                comment: parsed.data.comment,
            } as any);
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the device user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={loading}
                className={cn(
                    'rounded-md disabled:cursor-not-allowed bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center',
                )}
            >
                <SquarePen size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll' : 'invisible'} `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw] text-wrap`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                            Edit Device User
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <form
                        ref={formRef}
                        className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                        onSubmit={handleSubmit}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">User ID</span>
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={deviceUserData.user_id}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">Employee*</span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.employee && errors.employee}
                                    </span>
                                </label>
                                <Select
                                    {...setClassNameAndIsDisabled(isOpen)}
                                    options={employeeOptions}
                                    closeMenuOnSelect={true}
                                    placeholder="Select employee"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    styles={setCalculatedZIndex(baseZIndex)}
                                    value={selectedEmployee || null}
                                    onChange={option =>
                                        handleChange(
                                            'employee',
                                            option?.value || '',
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Card Number
                                    </span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.card_number &&
                                            errors.card_number}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={editedData.card_number || ''}
                                    onChange={e =>
                                        handleChange(
                                            'card_number',
                                            e.target.value || null,
                                        )
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="Enter card number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Comment</span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.comment && errors.comment}
                                </span>
                            </label>
                            <textarea
                                value={editedData.comment || ''}
                                onChange={e =>
                                    handleChange('comment', e.target.value)
                                }
                                rows={5}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                placeholder="Write any note about the device user"
                            />
                        </div>
                    </form>

                    <footer
                        className={cn(
                            'flex items-center px-4 py-2 border-t justify-end gap-6 border-gray-200 rounded-b',
                        )}
                    >
                        <div className="space-x-2 justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                                disabled={submitting}
                            >
                                Close
                            </button>
                            <button
                                disabled={submitting}
                                onClick={() => {
                                    formRef.current?.requestSubmit();
                                }}
                                className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                            >
                                {submitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default EditButton;
