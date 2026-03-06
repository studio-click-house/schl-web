'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import type { TicketStatus } from '@repo/common/constants/ticket.constant';
import {
    CLOSED_TICKET_STATUSES,
    statusOptions,
} from '@repo/common/constants/ticket.constant';
import {
    setCalculatedZIndex,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { Pencil, SquarePen, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';

interface Props {
    ticketId: string;
    currentStatus: string;
    onUpdated: () => void;
}

interface FormData {
    status: string;
}

const baseZIndex = 50;

const StatusEdit: React.FC<Props> = ({
    ticketId,
    currentStatus,
    onUpdated,
}) => {
    const authedFetchApi = useAuthedFetchApi();
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const { control, handleSubmit, reset } = useForm<FormData>({
        defaultValues: { status: currentStatus },
    });

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            reset({ status: currentStatus });
        }
    }, [isOpen, currentStatus, reset]);

    const onSubmit = async (data: FormData) => {
        try {
            setSubmitting(true);
            const payload = { status: data.status };
            const resp = await authedFetchApi<{ message: string }>(
                { path: `/v1/ticket/update-ticket/${ticketId}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            );
            if (resp.ok) {
                toast.success('Status updated');
                onUpdated();
                setIsOpen(false);
            } else {
                toastFetchError(resp);
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred while updating status');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={submitting}
                className="rounded-md bg-blue-700 hover:opacity-90 hover:ring-2 hover:ring-blue-700 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <Pencil size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed inset-0 flex justify-center items-center z-${baseZIndex} transition-colors ${
                    isOpen
                        ? 'visible bg-black/20 disable-page-scroll pointer-events-auto'
                        : 'invisible pointer-events-none'
                }`}
            >
                {isOpen && (
                    <article
                        ref={popupRef}
                        onClick={e => e.stopPropagation()}
                        className={`${
                            isOpen
                                ? 'scale-100 opacity-100'
                                : 'scale-125 opacity-0'
                        } bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw] text-wrap`}
                    >
                        <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                            <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                                Update Status
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                type="button"
                                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center "
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                            ref={formRef}
                        >
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">
                                    Status
                                </label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            className="react-select"
                                            options={statusOptions.filter(
                                                o =>
                                                    !CLOSED_TICKET_STATUSES.includes(
                                                        o.value as TicketStatus,
                                                    ),
                                            )}
                                            value={
                                                statusOptions.find(
                                                    o =>
                                                        o.value === field.value,
                                                ) || null
                                            }
                                            onChange={opt =>
                                                field.onChange(opt?.value || '')
                                            }
                                            isClearable={false}
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            styles={setCalculatedZIndex(
                                                baseZIndex,
                                            )}
                                        />
                                    )}
                                />
                            </div>
                        </form>
                        <footer className="flex items-center px-4 py-2 border-t justify-end gap-6 border-gray-200 rounded-b">
                            <div className="space-x-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                    disabled={submitting}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() =>
                                        formRef.current?.requestSubmit()
                                    }
                                    className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </footer>
                    </article>
                )}
            </section>
        </>
    );
};

export default StatusEdit;
