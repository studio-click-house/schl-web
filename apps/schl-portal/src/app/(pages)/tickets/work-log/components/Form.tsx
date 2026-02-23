'use client';

import Badge from '@/components/Badge';
import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    priorityOptions, statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import { formatDate } from '@repo/common/utils/date-helpers';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { ExternalLink } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import {
    getTicketPriorityBadgeClass,
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from '../../my-tickets/components/ticket-badge.helper';
import { WorkLogFormType, validationSchema } from '../schema';

type Props = {
    ticketsData: TicketDocument[];
};

const Form: React.FC<Props> = ({ ticketsData }) => {
    const authedFetchApi = useAuthedFetchApi();

    const [loading, setLoading] = useState(false);
    const [editorResetKey, setEditorResetKey] = useState(0);
    const [selectedTicketId, setSelectedTicketId] = useState<string>('');
    type TicketDetails = {
        ticket_number: string;
        title: string;
        type: string;
        status: string;
        priority?: string;
        createdAt: string;
        opened_by_name?: string;
    };
    const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(
        null,
    );
    const [ticketFetchError, setTicketFetchError] = useState<string | null>(
        null,
    );

    const ticketOptions = useMemo(
        () =>
            (ticketsData || []).map(t => ({
                value: String(t._id),
                label: t.ticket_number,
            })),
        [ticketsData],
    );

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<WorkLogFormType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            ticketId: '',
            sha: '',
            message: '',
            description: '',
            type: undefined,
            status: undefined,
            priority: undefined,
        },
    });

    async function submitWorkLog(data: WorkLogFormType) {
        // ensure ticket details present before submitting
        if (!ticketDetails) {
            toast.error('Please select and load a valid ticket first');
            return;
        }
        try {
            setLoading(true);

            const parsed = validationSchema.safeParse(data);
            if (!parsed.success) {
                console.error(parsed.error.issues.map(i => i.message));
                toast.error('Invalid form data');
                return;
            }

            const ticketId = parsed.data.ticketId;
            const payload = {
                sha: parsed.data.sha?.trim() || '',
                message: parsed.data.message.trim(),
                description: parsed.data.description?.trim() || '',
                type: parsed.data.type,
                status: parsed.data.status,
                priority: parsed.data.priority,
            } as Record<string, unknown>;

            const response = await authedFetchApi(
                {
                    path: `/v1/ticket/add-commit/${encodeURIComponent(ticketId)}`,
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Commit submitted and ticket updated');
                reset();
                setEditorResetKey(prev => prev + 1);
            } else {
                toastFetchError(response);
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred while submitting commit');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (d: WorkLogFormType) => await submitWorkLog(d);

    const fetchTicket = async (id: string) => {
        setTicketDetails(null);
        setTicketFetchError(null);
        if (!id) return;
        try {
            const resp = await authedFetchApi<TicketDetails>(
                { path: `/v1/ticket/get-ticket/${encodeURIComponent(id)}` },
                { method: 'GET' },
            );
            if (resp.ok && resp.data) {
                setTicketDetails(resp.data);
            } else {
                setTicketFetchError('Unable to fetch the ticket');
                toast.error('Unable to fetch the ticket');
            }
        } catch (e) {
            console.error(e);
            setTicketFetchError('Unable to fetch the ticket');
            toast.error('Unable to fetch the ticket');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                <div className="md:col-span-2 max-w-xl">
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Ticket*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.ticketId && errors.ticketId.message}
                        </span>
                    </label>
                    <Controller
                        name="ticketId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={ticketOptions}
                                closeMenuOnSelect
                                placeholder="Select ticket"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    ticketOptions.find(
                                        o => o.value === field.value,
                                    ) || null
                                }
                                onChange={option => {
                                    const val = option ? option.value : '';
                                    field.onChange(val);
                                    setSelectedTicketId(val);
                                    fetchTicket(val);
                                }}
                            />
                        )}
                    />
                </div>

                {selectedTicketId ? (
                    ticketDetails ? (
                        <>
                            <div className="md:col-span-2 max-w-xl block rounded-lg border border-gray-200 bg-white p-4 md:p-6 mb-4">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-lg">
                                        {ticketDetails.title}{' '}
                                        <span className="text-gray-500">
                                            [#{ticketDetails.ticket_number}]
                                        </span>
                                    </h4>
                                    <a
                                        href={`/tickets/${encodeURIComponent(ticketDetails.ticket_number)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-gray-700"
                                        title="Open ticket in new tab"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    {ticketDetails.createdAt &&
                                        formatDate(ticketDetails.createdAt)}
                                    {ticketDetails.opened_by_name &&
                                        ` • ${ticketDetails.opened_by_name}`}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4 uppercase">
                                    {ticketDetails.type && (
                                        <Badge
                                            value={ticketDetails.type}
                                            className={getTicketTypeBadgeClass(
                                                ticketDetails.type,
                                            )}
                                        />
                                    )}
                                    {ticketDetails.status && (
                                        <Badge
                                            value={ticketDetails.status}
                                            className={getTicketStatusBadgeClass(
                                                ticketDetails.status,
                                            )}
                                        />
                                    )}
                                    {ticketDetails.priority && (
                                        <Badge
                                            value={ticketDetails.priority}
                                            className={getTicketPriorityBadgeClass(
                                                ticketDetails.priority,
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                        <span className="uppercase">Type</span>
                                    </label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                options={typeOptions}
                                                closeMenuOnSelect
                                                placeholder="(leave unchanged)"
                                                classNamePrefix="react-select"
                                                menuPortalTarget={
                                                    setMenuPortalTarget
                                                }
                                                value={
                                                    typeOptions.find(
                                                        option =>
                                                            option.value ===
                                                            field.value,
                                                    ) || null
                                                }
                                                onChange={option =>
                                                    field.onChange(
                                                        option?.value ||
                                                            undefined,
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                        <span className="uppercase">
                                            Status
                                        </span>
                                    </label>
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                options={statusOptions}
                                                closeMenuOnSelect
                                                placeholder="(leave unchanged)"
                                                classNamePrefix="react-select"
                                                menuPortalTarget={
                                                    setMenuPortalTarget
                                                }
                                                value={
                                                    statusOptions.find(
                                                        option =>
                                                            option.value ===
                                                            field.value,
                                                    ) || null
                                                }
                                                onChange={option =>
                                                    field.onChange(
                                                        option?.value ||
                                                            undefined,
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                        <span className="uppercase">
                                            Priority
                                        </span>
                                    </label>
                                    <Controller
                                        name="priority"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                options={priorityOptions}
                                                closeMenuOnSelect
                                                placeholder="(leave unchanged)"
                                                classNamePrefix="react-select"
                                                menuPortalTarget={
                                                    setMenuPortalTarget
                                                }
                                                value={
                                                    priorityOptions.find(
                                                        option =>
                                                            option.value ===
                                                            field.value,
                                                    ) || null
                                                }
                                                onChange={option =>
                                                    field.onChange(
                                                        option?.value ||
                                                            undefined,
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">
                                        Commit message*
                                    </span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.message &&
                                            errors.message.message}
                                    </span>
                                </label>
                                <input
                                    {...register('message')}
                                    autoComplete="off"
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="Short commit message"
                                    type="text"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">
                                        Commit SHA
                                    </span>
                                </label>
                                <input
                                    {...register('sha')}
                                    autoComplete="off"
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    placeholder="Enter commit SHA"
                                    type="text"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">
                                        Description
                                    </span>
                                </label>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({
                                        field: { onChange, value },
                                    }) => (
                                        <NoticeBodyEditor
                                            key={editorResetKey}
                                            onChange={onChange}
                                            initialContent={value ?? ''}
                                        />
                                    )}
                                />
                            </div>
                        </>
                    ) : ticketFetchError ? (
                        <div className="md:col-span-2 max-w-xl text-red-600">
                            Unable to fetch the ticket
                        </div>
                    ) : (
                        <div className="md:col-span-2 max-w-xl text-gray-600">
                            Loading ticket...
                        </div>
                    )
                ) : null}
            </div>

            <button
                type="submit"
                disabled={loading || !ticketDetails}
                className="rounded-md bg-primary text-white hover:opacity-95 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase disabled:cursor-not-allowed"
            >
                {loading ? 'Submitting...' : 'Submit Work Log'}
            </button>
        </form>
    );
};

export default Form;
