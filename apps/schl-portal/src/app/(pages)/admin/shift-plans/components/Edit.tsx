'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ShiftTemplate } from '@repo/common/models/shift-template.schema';
import { SquarePen, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ShiftPlanEditData, shiftPlanEditSchema } from '../schema';

const baseZIndex = 50;

interface ShiftTemplateWithId extends ShiftTemplate {
    _id: string;
}

interface EditButtonProps {
    shiftPlan: ShiftTemplateWithId;
    submitHandler: () => void;
}

const EditButton = ({ shiftPlan, submitHandler }: EditButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const authedFetchApi = useAuthedFetchApi();
    const popupRef = useRef<HTMLElement>(null);

    const fromDateString = shiftPlan.effective_from
        ? (new Date(shiftPlan.effective_from).toISOString().split('T')[0] ?? '')
        : '';
    const toDateString = shiftPlan.effective_to
        ? (new Date(shiftPlan.effective_to).toISOString().split('T')[0] ?? '')
        : '';

    const [formData, setFormData] = useState<ShiftPlanEditData>({
        fromDate: fromDateString || '',
        toDate: toDateString || '',
        shiftType: shiftPlan.shift_type,
        shiftStart: shiftPlan.shift_start,
        shiftEnd: shiftPlan.shift_end,
        active: shiftPlan.active,
        changeReason: shiftPlan.change_reason || '',
    });

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
    ) => {
        const { name, value, type } = e.target as any;
        setFormData({
            ...formData,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : value,
        });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const validated = shiftPlanEditSchema.parse(formData);

            const response = await authedFetchApi<ShiftTemplate>(
                { path: `/v1/shift-plan/${shiftPlan._id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(validated),
                },
            );

            if (response.ok) {
                toast.success('Shift plan updated successfully');
                setIsOpen(false);
                submitHandler();
            } else {
                toastFetchError(response);
            }
        } catch (error: any) {
            if (error.errors) {
                const newErrors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    if (err.path[0]) {
                        newErrors[err.path[0]] = err.message;
                    }
                });
                setErrors(newErrors);
            } else {
                toast.error('An error occurred');
            }
        } finally {
            setIsLoading(false);
        }
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
                className="rounded-md bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
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
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative lg:w-[50vw] md:w-[70vw] sm:w-[80vw]`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Edit Shift Template
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                        <span className="uppercase">
                                            From Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={formData.fromDate}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                    {errors.fromDate && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.fromDate}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                        <span className="uppercase">
                                            To Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={formData.toDate}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                    {errors.toDate && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.toDate}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                        <span className="uppercase">
                                            Shift Type
                                        </span>
                                    </label>
                                    <select
                                        name="shiftType"
                                        value={formData.shiftType}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    >
                                        <option value="morning">Morning</option>
                                        <option value="evening">Evening</option>
                                        <option value="night">Night</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                    {errors.shiftType && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.shiftType}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                        <span className="uppercase">
                                            Start Time (HH:mm)
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        name="shiftStart"
                                        placeholder="09:00"
                                        value={formData.shiftStart}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                    {errors.shiftStart && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.shiftStart}
                                        </p>
                                    )}
                                </div>

                                <div className="md:col-span-1">
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                        <span className="uppercase">
                                            End Time (HH:mm)
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        name="shiftEnd"
                                        placeholder="17:00"
                                        value={formData.shiftEnd}
                                        onChange={handleInputChange}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                    {errors.shiftEnd && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.shiftEnd}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={formData.active ?? true}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-primary rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700 uppercase">
                                        Active Template
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Deactivate to stop using this template for
                                    new days
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 text-center">
                                    <span className="uppercase">
                                        Change Reason
                                    </span>
                                </label>
                                <textarea
                                    name="changeReason"
                                    placeholder="e.g., Christmas special, Eid break..."
                                    value={formData.changeReason}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                                {errors.changeReason && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.changeReason}
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="rounded-md bg-blue-600 text-white   hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default EditButton;
