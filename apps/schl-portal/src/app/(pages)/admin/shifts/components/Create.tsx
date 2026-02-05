'use client';

import {
    SHIFT_TYPES,
    type ShiftType,
} from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useMemo, useRef, useState } from 'react';
import { ShiftDataType } from './ShiftConfigTable';

const baseZIndex = 50;

interface PropsType {
    loading: boolean;
    submitHandler: (shiftData: ShiftDataType) => Promise<void>;
}

const CreateButton: React.FC<PropsType> = ({ loading, submitHandler }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const canCreate = hasPerm('admin:manage_shifts', userPermissions);

    const [formData, setFormData] = useState<ShiftDataType>({
        type: 'morning',
        name: '',
        start_time: '09:00',
        end_time: '17:00',
        grace_minutes: 15,
        crosses_midnight: false,
        is_active: true,
    });

    const resetForm = () => {
        setFormData({
            type: 'morning',
            name: '',
            start_time: '09:00',
            end_time: '17:00',
            grace_minutes: 15,
            crosses_midnight: false,
            is_active: true,
        });
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreate) return;
        await submitHandler(formData);
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
                Add new shift
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
                        className="scale-100 opacity-100 bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw] text-wrap"
                    >
                        <header className="flex items-center justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Create New Shift
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
                                    <span className="uppercase">
                                        Shift Type*
                                    </span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            type: e.target.value as ShiftType,
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                >
                                    {SHIFT_TYPES.map(type => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() +
                                                type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Shift Name*
                                    </span>
                                </label>
                                <input
                                    value={formData.name}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="e.g., Morning Shift A"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            Start Time*
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                start_time: e.target.value,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                        <span className="uppercase">
                                            End Time*
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                end_time: e.target.value,
                                            })
                                        }
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    <span className="uppercase">
                                        Grace Minutes
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.grace_minutes}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            grace_minutes: parseInt(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2.5 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.crosses_midnight}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                crosses_midnight:
                                                    e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Crosses Midnight
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                is_active: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Active
                                    </span>
                                </label>
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
