'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { CirclePlus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';

const baseZIndex = 50;

import { zodResolver } from '@hookform/resolvers/zod';
import { DailyUpdateFormData, dailyUpdateSchema } from './daily-update-schema';

interface PropsType {
    submitHandler: (data: DailyUpdateFormData) => Promise<void>;
}

export default function DailyUpdateModal(props: PropsType) {
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLElement | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [ticketOptions, setTicketOptions] = useState<
        { label: string; value: string }[]
    >([]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<DailyUpdateFormData>({
        resolver: zodResolver(dailyUpdateSchema),
        defaultValues: {
            message: '',
            ticket: undefined,
        },
    });

    // fetch ticket options when modal opens
    useEffect(() => {
        if (!isOpen) return;
        const loadTickets = async () => {
            try {
                if (!session?.user.db_id) return;
                const resp = await authedFetchApi<{
                    pagination?: any;
                    items: any[];
                }>(
                    {
                        path: '/v1/ticket/search-tickets',
                        query: { page: 1, itemsPerPage: 100, paginated: false },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            excludeClosed: true,
                            assignees: [session.user.db_id],
                            includeUnassigned: true,
                            deadlineStatus: 'not-overdue',
                        }),
                    },
                );
                if (resp.ok && resp.data) {
                    const items = Array.isArray(resp.data)
                        ? resp.data
                        : resp.data.items || [];
                    const opts = (items as any[]).map(t => ({
                        label: `${t.ticket_number.replace('SCHL-', '')} – ${t.title.trim().slice(0, 25)}${t.title.length > 25 ? '...' : ''}`,
                        value: String(t._id),
                    }));
                    setTicketOptions(opts);
                }
            } catch (e) {
                console.error('failed loading tickets', e);
            }
        };
        loadTickets();
    }, [isOpen, authedFetchApi, session?.user.db_id]);

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

    const onSubmit = async (data: DailyUpdateFormData) => {
        await props.submitHandler(data);
        handleResetForm();
        setIsOpen(false);
    };

    const handleResetForm = () => {
        reset({ message: '', ticket: undefined });
    };

    return (
        <>
            <button
                onClick={() => {
                    handleResetForm();
                    setIsOpen(true);
                }}
                className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
            >
                Submit Work Update
                <CirclePlus size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${
                    isOpen
                        ? 'visible bg-black/20 disable-page-scroll pointer-events-auto'
                        : 'invisible pointer-events-none'
                }`}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${
                        isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'
                    } bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw] text-wrap`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                            Daily Work Update
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
                        ref={formRef}
                        className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="grid grid-cols-1 gap-y-4">
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">Message*</span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.message &&
                                            errors.message.message}
                                    </span>
                                </label>
                                <textarea
                                    {...register('message')}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="uppercase tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                    Ticket
                                </label>
                                <Controller
                                    name="ticket"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...setClassNameAndIsDisabled(
                                                isOpen,
                                            )}
                                            options={ticketOptions}
                                            classNamePrefix="react-select"
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            styles={setCalculatedZIndex(
                                                baseZIndex,
                                            )}
                                            value={
                                                ticketOptions.find(
                                                    o =>
                                                        o.value === field.value,
                                                ) || null
                                            }
                                            onChange={opt =>
                                                field.onChange(opt?.value)
                                            }
                                            isClearable
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                    <footer className="flex items-center px-4 py-2 border-t justify-end gap-6 border-gray-200 rounded-b">
                        <div className="space-x-2 justify-end">
                            <button
                                onClick={() => {
                                    handleResetForm();
                                }}
                                className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                                type="button"
                            >
                                Reset
                            </button>
                            <button
                                className="rounded-md bg-blue-600 text-white   hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                                type="button"
                                onClick={() => formRef.current?.requestSubmit()}
                            >
                                Submit
                            </button>
                        </div>
                    </footer>
                </article>
            </section>
        </>
    );
}
