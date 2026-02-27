'use client';

import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { capitalize } from 'lodash';
import { CirclePlus, SquareArrowOutUpRight } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import EditButton from '../../all-tickets/components/Edit';
import FilterButton from '../../all-tickets/components/Filter';
import {
    getTicketPriorityBadgeClass,
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from '../../all-tickets/components/ticket-badge.helper';
import { TicketFormDataType, validationSchema } from '../../schema';
import type { DailyUpdateFormData } from './daily-update-schema';
import DailyUpdateModal from './DailyUpdateModal';
import StatusEdit from './StatusEdit';

interface TicketData extends TicketDocument {
    created_by_name?: string;
    assigned_by_name?: string;
}

type TicketsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: TicketData[];
};

function Table() {
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<TicketsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();

    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [filters, setFilters] = useState({
        ticketNumber: '',
        title: '',
        type: '',
        status: '',
        fromDate: '',
        toDate: '',
        deadlineStatus: '',
        createdBy: '',
        assignees: [] as string[],
        excludeClosed: true,
    });

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const router = useRouter();

    const canReviewTicket = useMemo(
        () => hasPerm('ticket:review_works', userPermissions),
        [userPermissions],
    );

    const canSubmit = useMemo(
        () => hasPerm('ticket:submit_daily_work', userPermissions),
        [userPermissions],
    );

    const getAllTickets = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<TicketsState>(
                    {
                        path: '/v1/ticket/search-tickets',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            assignees: !canReviewTicket
                                ? [session?.user.db_id || '']
                                : [],
                            excludeClosed: true,
                        }),
                    },
                );

                if (response.ok) {
                    setTickets(response.data);
                    setIsFiltered(false);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving tickets');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, session?.user.db_id, canReviewTicket],
    );

    const getAllTicketsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<TicketsState>(
                    {
                        path: '/v1/ticket/search-tickets',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...filters,
                            assignees: !canReviewTicket
                                ? [session?.user.db_id || '']
                                : filters.assignees,
                            excludeClosed: true,
                        }),
                    },
                );

                if (response.ok) {
                    setTickets(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving tickets');
            } finally {
                setLoading(false);
            }
            return;
        },
        [authedFetchApi, filters, session?.user.db_id, canReviewTicket],
    );

    const fetchTickets = useCallback(async () => {
        if (!isFiltered) {
            await getAllTickets(page, itemPerPage);
        } else {
            await getAllTicketsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllTickets, getAllTicketsFiltered, page, itemPerPage]);

    const createDailyUpdate = async (data: DailyUpdateFormData) => {
        try {
            const body = { ...data }; // ticket may be undefined
            const response = await authedFetchApi<{ message: string }>(
                { path: '/v1/daily-update/create-daily-update' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            if (response.ok) {
                toast.success('Submitted daily work update');
                // await fetchTickets();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while submitting update');
        }
    };

    const editTicket = async (editedTicketData: TicketFormDataType) => {
        try {
            setLoading(true);
            const parsed = validationSchema.safeParse(editedTicketData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const { _id, ...rest } = parsed.data;

            // convert deadline string to ISO or keep null when explicitly cleared
            const payload: any = { ...rest };
            if (rest.deadline !== undefined) {
                payload.deadline = rest.deadline
                    ? new Date(rest.deadline).toISOString()
                    : null;
            }

            const response = await authedFetchApi(
                { path: `/v1/ticket/update-ticket/${_id}` },
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Updated the ticket data');
                await fetchTickets();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the ticket');
        } finally {
            setLoading(false);
        }
    };

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchTickets,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchTickets();
        }
    }, [searchVersion, isFiltered, page]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, []);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    canSubmit
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {canSubmit && (
                    <DailyUpdateModal submitHandler={createDailyUpdate} />
                )}

                <div className="items-center flex gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e =>
                            setItemPerPage(parseInt(e.target.value, 10))
                        }
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <FilterButton
                        isLoading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        canReviewTicket={canReviewTicket}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading && <p className="text-center">Loading...</p>}

            <div className="table-responsive text-md overflow-x-auto">
                {!loading &&
                    (tickets?.items?.length !== 0 ? (
                        <table className="table border-gray-300 table-bordered min-w-full">
                            <colgroup>
                                <col className="min-w-[40px]" />
                                <col className="whitespace-nowrap min-w-[120px]" />
                                <col className="whitespace-nowrap min-w-[120px]" />
                                <col className="whitespace-nowrap min-w-[150px]" />
                                {canReviewTicket && (
                                    <col className="whitespace-nowrap min-w-[150px]" />
                                )}
                                <col className="whitespace-nowrap min-w-[150px]" />
                                <col className="min-w-[300px]" />
                                <col className="whitespace-nowrap min-w-[100px]" />
                                <col className="whitespace-nowrap min-w-[100px]" />
                                <col className="whitespace-nowrap min-w-[100px]" />
                                <col className="whitespace-nowrap min-w-[80px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-50 whitespace-nowrap">
                                    <th className="whitespace-nowrap">S/N</th>
                                    <th className="whitespace-nowrap">Date</th>
                                    <th className="whitespace-nowrap">
                                        Ticket No
                                    </th>
                                    <th className="whitespace-nowrap">
                                        Assigned By
                                    </th>
                                    {canReviewTicket && (
                                        <th className="whitespace-nowrap">
                                            Assigned To
                                        </th>
                                    )}

                                    <th className="whitespace-nowrap">
                                        Deadline
                                    </th>
                                    <th className="whitespace-nowrap">
                                        Message
                                    </th>
                                    <th className="whitespace-nowrap">Type</th>
                                    <th className="whitespace-nowrap">
                                        Priority
                                    </th>
                                    <th className="whitespace-nowrap">
                                        Status
                                    </th>
                                    <th className="whitespace-nowrap">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-base">
                                {tickets.items.map((ticket, i) => (
                                    <tr
                                        key={String(ticket._id)}
                                        className={
                                            moment(ticket.deadline).isBefore(
                                                moment(),
                                            )
                                                ? 'table-danger'
                                                : 'text-black'
                                        }
                                    >
                                        <td>
                                            {i + 1 + itemPerPage * (page - 1)}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            {formatDate(ticket.createdAt)}
                                        </td>
                                        <td className="text-balance">
                                            {ticket.ticket_number.replace(
                                                'SCHL-',
                                                '',
                                            )}
                                        </td>
                                        <td className="text-balance">
                                            {ticket.assigned_by_name
                                                ? ticket.assigned_by_name
                                                : 'N/A'}
                                        </td>
                                        {canReviewTicket && (
                                            <td className="text-balance">
                                                {ticket.assignees &&
                                                ticket.assignees.length > 0
                                                    ? ticket.assignees
                                                          .map(
                                                              assignee =>
                                                                  assignee.name,
                                                          )
                                                          .join(', ')
                                                    : 'N/A'}
                                            </td>
                                        )}
                                        <td className="whitespace-nowrap">
                                            {ticket.deadline
                                                ? `${formatDate(ticket.deadline)} | ${formatTime(
                                                      formatTimestamp(
                                                          ticket.deadline,
                                                      ).time,
                                                  )}`
                                                : 'N/A'}
                                        </td>
                                        <ExtendableTd
                                            data={ticket.title}
                                            len={50}
                                        />
                                        <td
                                            className="uppercase whitespace-nowrap"
                                            style={{
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <Badge
                                                value={capitalize(ticket.type)}
                                                className={getTicketTypeBadgeClass(
                                                    ticket.type,
                                                )}
                                            />
                                        </td>
                                        <td
                                            className="uppercase whitespace-nowrap"
                                            style={{
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <Badge
                                                value={capitalize(
                                                    ticket.priority,
                                                )}
                                                className={getTicketPriorityBadgeClass(
                                                    ticket.priority,
                                                )}
                                            />
                                        </td>

                                        <td
                                            className="uppercase whitespace-nowrap"
                                            style={{
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <Badge
                                                value={capitalize(
                                                    ticket.status,
                                                )}
                                                className={getTicketStatusBadgeClass(
                                                    ticket.status,
                                                )}
                                            />
                                        </td>
                                        <td
                                            className="whitespace-nowrap"
                                            style={{
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <div className="inline-block">
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/tickets/${ticket.ticket_number}`}
                                                        target="_blank"
                                                        className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                    >
                                                        <SquareArrowOutUpRight
                                                            size={16}
                                                        />
                                                    </Link>
                                                    {canSubmit &&
                                                        (!ticket.deadline ||
                                                            moment(
                                                                ticket.deadline,
                                                            ).isAfter(
                                                                moment(),
                                                            )) && (
                                                            <StatusEdit
                                                                ticketId={String(
                                                                    ticket._id,
                                                                )}
                                                                currentStatus={
                                                                    ticket.status
                                                                }
                                                                onUpdated={
                                                                    fetchTickets
                                                                }
                                                            />
                                                        )}
                                                    {canReviewTicket && (
                                                        <EditButton
                                                            isLoading={loading}
                                                            canReviewTicket={
                                                                canReviewTicket
                                                            }
                                                            submitHandler={
                                                                editTicket
                                                            }
                                                            ticketData={{
                                                                _id: String(
                                                                    ticket._id,
                                                                ),
                                                                title: ticket.title,
                                                                description:
                                                                    ticket.description,
                                                                type: ticket.type,
                                                                status: ticket.status,
                                                                priority:
                                                                    ticket.priority,
                                                                deadline:
                                                                    ticket.deadline
                                                                        ? typeof ticket.deadline ===
                                                                          'string'
                                                                            ? ticket.deadline
                                                                            : ticket.deadline.toISOString()
                                                                        : undefined,
                                                                assignees: (
                                                                    ticket.assignees ||
                                                                    []
                                                                )
                                                                    .map(a => {
                                                                        const id =
                                                                            a.db_id;
                                                                        if (!id)
                                                                            return null;
                                                                        return {
                                                                            db_id: String(
                                                                                id,
                                                                            ),
                                                                            name: a.name,
                                                                            e_id: a.e_id,
                                                                        };
                                                                    })
                                                                    .filter(
                                                                        Boolean,
                                                                    ) as {
                                                                    db_id: string;
                                                                    name: string;
                                                                    e_id: string;
                                                                }[],
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Tickets Found" type={Type.danger} />
                    ))}
            </div>
            <style jsx>
                {`
                    .table {
                        font-size: 15px;
                    }

                    th,
                    td {
                        padding: 3px 6px;
                    }
                `}
            </style>
        </>
    );
}

export default Table;
