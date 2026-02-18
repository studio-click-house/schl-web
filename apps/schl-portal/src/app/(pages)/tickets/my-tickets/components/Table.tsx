'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { CirclePlus, SquareArrowOutUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { formatDate } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';

import { TicketDocument } from '@repo/common/models/ticket.schema';
import { capitalize } from 'lodash';
import { TicketFormDataType, validationSchema } from '../../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';
import {
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from './ticket-badge.helper';

type TicketsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: TicketDocument[];
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
                            myTickets: true,
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
                            myTickets: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(filters),
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

            const { _id, tags, ...rest } = parsed.data;

            if (!_id) {
                toast.error('Missing ticket identifier');
                return;
            }

            const payload = {
                ...rest,
                tags: tags
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean),
            };

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
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (tickets?.items?.length !== 0 ? (
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Ticket No</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.items.map((ticket, index) => {
                                    const canManage =
                                        String(ticket.opened_by) ===
                                        session?.user.db_id;
                                    const canEdit =
                                        canManage &&
                                        ticket.status !== 'done';

                                    return (
                                        <tr key={ticket.ticket_number}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td>
                                                {ticket.createdAt
                                                    ? formatDate(
                                                          ticket.createdAt,
                                                      )
                                                    : null}
                                            </td>
                                            <td>{ticket.ticket_number}</td>
                                            <td className="text-wrap">
                                                {ticket.title}
                                            </td>
                                            <td
                                                className="uppercase text-wrap text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="flex justify-center">
                                                    <Badge
                                                        value={capitalize(
                                                            ticket.type,
                                                        )}
                                                        className={getTicketTypeBadgeClass(
                                                            ticket.type,
                                                        )}
                                                    />
                                                </div>
                                            </td>
                                            <td
                                                className="uppercase text-wrap text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="flex justify-center">
                                                    <Badge
                                                        value={capitalize(
                                                            ticket.status,
                                                        )}
                                                        className={getTicketStatusBadgeClass(
                                                            ticket.status,
                                                        )}
                                                    />
                                                </div>
                                            </td>
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        {canManage && (
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

                                                        {canEdit && (
                                                            <EditButton
                                                                isLoading={
                                                                    loading
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
                                                                    tags: ticket.tags.join(
                                                                        ', ',
                                                                    ),
                                                                }}
                                                            />
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                window.open(
                                                                    process.env
                                                                        .NEXT_PUBLIC_BASE_URL +
                                                                        `/tickets/${encodeURIComponent(ticket.ticket_number)}`,
                                                                    '_blank',
                                                                );
                                                            }}
                                                            className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                        >
                                                            <SquareArrowOutUpRight
                                                                size={16}
                                                            />
                                                        </button>
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
