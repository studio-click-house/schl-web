'use client';

import { useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { SquarePen, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import {
    DailyReportFormData,
    dailyUpdateSchema,
} from '../../pending-jobs/components/daily-report/schema';

const baseZIndex = 50;

interface ReportData {
    _id: string;
    message: string;
    ticket?: { ticket_number: string; _id?: string };
    ticket_id?: string; // mongo id of the ticket, if available
}

interface PropsType {
    reportData: ReportData;
    canReviewReports: boolean;
    submitHandler: (
        data: DailyReportFormData & { _id: string },
    ) => Promise<void>;
}

export default function EditDailyReportModal(props: PropsType) {
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
    } = useForm<DailyReportFormData>({
        resolver: zodResolver(dailyUpdateSchema),
        defaultValues: {
            message: props.reportData.message,
            ticket: props.reportData.ticket_id ?? null,
        },
    });

    // reset form values whenever the modal opens (in case parent data changed)
    useEffect(() => {
        if (isOpen) {
            reset({
                message: props.reportData.message,
                ticket: props.reportData.ticket_id ?? null,
            });
        }
    }, [isOpen, props.reportData, reset]);

    // load ticket options when the modal opens
    useEffect(() => {
        if (!isOpen) return;
        const loadTickets = async () => {
            try {
                if (!session?.user.db_id) return;

                const body: Record<string, any> = {
                    excludeClosed: true,
                    excludeInReview: true,
                };

                if (!props.canReviewReports) {
                    // non-reviewers: only tickets assigned to them or unassigned
                    body.assignees = [session.user.db_id];
                    body.includeUnassigned = true;
                }

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
                        body: JSON.stringify(body),
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
    }, [isOpen, authedFetchApi, session?.user.db_id, props.canReviewReports]);

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

    const onSubmit = async (data: DailyReportFormData) => {
        await props.submitHandler({ ...data, _id: props.reportData._id });
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded-md bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <SquarePen size={16} />
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
                            Edit Daily Report
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
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="grid grid-cols-1 gap-y-4">
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
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
                                                field.onChange(
                                                    opt?.value ?? null,
                                                )
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
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="rounded-md bg-blue-600 text-white hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                                type="button"
                                onClick={() => formRef.current?.requestSubmit()}
                            >
                                Save
                            </button>
                        </div>
                    </footer>
                </article>
            </section>
        </>
    );
}
