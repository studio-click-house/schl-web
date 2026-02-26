'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus, SquareArrowOutUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import ExtendableTd from '@/components/ExtendableTd';
import { CLOSED_TICKET_STATUSES } from '@repo/common/constants/ticket.constant';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import { capitalize } from 'lodash';
import { TicketFormDataType, validationSchema } from '../../schema';
import {
    getTicketPriorityBadgeClass,
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from '../components/ticket-badge.helper';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

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

const Table = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [tickets, setTickets] = useState<TicketsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const canReviewTicket = useMemo(
        () => hasPerm('ticket:review_works', userPermissions),
        [userPermissions],
    );

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        ticketNumber: '',
        title: '',
        type: '',
        status: '',
        fromDate: '',
        toDate: '',
        deadlineStatus: '',
        createdBy: '',
        assignee: '',
        excludeClosed: false,
    });

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
                            myTickets: !canReviewTicket,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
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
                toast.error('An error occurred while retrieving tickets data');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi],
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
                            myTickets: !canReviewTicket,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            ...filters,
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
                toast.error('An error occurred while retrieving tickets data');
            } finally {
                setIsLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const fetchTickets = useCallback(async () => {
        if (!isFiltered) {
            await getAllTickets(page, itemPerPage);
        } else {
            await getAllTicketsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllTickets, getAllTicketsFiltered, page, itemPerPage]);

    const deleteTicket = async (ticketData: { _id: string }) => {
        try {
            const response = await authedFetchApi<{ message: string }>(
                { path: `/v1/ticket/delete-ticket/${ticketData._id}` },
                {
                    method: 'DELETE',
                },
            );

            if (response.ok) {
                toast.success('Deleted the ticket successfully', {
                    id: 'success',
                });
                await fetchTickets();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting the ticket');
        }
    };

    const editTicket = async (editedTicketData: TicketFormDataType) => {
        try {
            setIsLoading(true);
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
                payload.deadline = rest.deadline ? new Date(rest.deadline).toISOString() : null;
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
            setIsLoading(false);
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
                    hasPerm('ticket:create_ticket', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('ticket:create_ticket', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/tickets/create',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Create Ticket
                        <CirclePlus size={18} />
                    </button>
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

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (tickets?.items?.length !== 0 ? (
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Created By</th>
                                    {canReviewTicket && <th>Assigned By</th>}
                                    <th>Ticket No</th>
                                    <th>Title</th>
                                    {canReviewTicket && <th>Deadline</th>}
                                    <th>Type</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.items.map((ticket, index) => {
                                    const canManage = hasPerm(
                                        'ticket:create_ticket',
                                        userPermissions,
                                    );
                                    const canEdit =
                                        canManage &&
                                        !CLOSED_TICKET_STATUSES.includes(
                                            ticket.status,
                                        );

                                    return (
                                        <tr key={ticket.ticket_number}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td className="text-nowrap">
                                                {ticket.createdAt &&
                                                    formatDate(
                                                        ticket.createdAt,
                                                    )}
                                            </td>
                                            {canReviewTicket && (
                                                <>
                                                    <td>
                                                        {ticket.created_by_name ||
                                                            'N/A'}
                                                    </td>
                                                    <td>
                                                        {ticket.assigned_by_name ||
                                                            'N/A'}
                                                    </td>
                                                </>
                                            )}
                                            <td className="text-nowrap">{ticket.ticket_number}</td>
                                            <ExtendableTd data={ticket.title} />
                                            {canReviewTicket && (
                                                <td className="text-nowrap">
                                                    {ticket.deadline
                                                        ? `${formatDate(ticket.deadline)} | ${formatTime(
                                                              formatTimestamp(
                                                                  ticket.deadline,
                                                              ).time,
                                                          )}`
                                                        : 'N/A'}
                                                </td>
                                            )}
                                            <td
                                                className="uppercase text-nowrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <Badge
                                                    value={capitalize(
                                                        ticket.type,
                                                    )}
                                                    className={getTicketTypeBadgeClass(
                                                        ticket.type,
                                                    )}
                                                />
                                            </td>
                                            <td
                                                className="uppercase text-nowrap"
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
                                                className="uppercase text-nowrap"
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
                                                className="text-nowrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        {(canManage ||
                                                            canReviewTicket) && (
                                                            <DeleteButton
                                                                ticketData={{
                                                                    _id: String(
                                                                        ticket._id,
                                                                    ),
                                                                }}
                                                                submitHandler={
                                                                    deleteTicket
                                                                }
                                                            />
                                                        )}

                                                        <Link
                                                            href={`/tickets/${ticket.ticket_number}`}
                                                            target="_blank"
                                                            className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                        >
                                                            <SquareArrowOutUpRight
                                                                size={16}
                                                            />
                                                        </Link>

                                                        {(canEdit ||
                                                            canReviewTicket) && (
                                                            <EditButton
                                                                isLoading={
                                                                    loading
                                                                }
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
                                                                        .map(
                                                                            a => {
                                                                                const id =
                                                                                    a.db_id;
                                                                                if (
                                                                                    !id
                                                                                )
                                                                                    return null;
                                                                                return {
                                                                                    db_id: String(
                                                                                        id,
                                                                                    ),
                                                                                    name: a.name,
                                                                                    e_id: a.e_id,
                                                                                };
                                                                            },
                                                                        )
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
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Tickets Found" type={Type.danger} />
                    ))}
            </div>
            <style jsx>
                {`
                    th,
                    td {
                        padding: 1.5px 5px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
