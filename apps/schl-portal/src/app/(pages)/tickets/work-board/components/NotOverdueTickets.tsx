'use client';

import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { capitalize } from 'lodash';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    getTicketPriorityBadgeClass,
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from '../../all-tickets/components/ticket-badge.helper';
import StatusEdit from './StatusEdit';

interface TicketData extends TicketDocument {
    created_by_name?: string;
    assigned_by_name?: string;
}

function NotOverdueTickets() {
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();
    const canSubmit = hasPerm('ticket:submit_daily_work', session?.user.permissions || []);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const body = {
                deadlineStatus: 'not-overdue',
                assignee: session?.user.db_id,
                excludeClosed: true,
            } as const;

            const response = await authedFetchApi<TicketData[]>(
                {
                    path: '/v1/ticket/search-tickets',
                    query: { paginated: false },
                },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            if (response.ok) {
                setTickets(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving tickets');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, session?.user.db_id]);

    useEffect(() => {
        if (session?.user.db_id) {
            void fetchTickets();
        }
    }, [fetchTickets, session?.user.db_id]);

    if (loading) {
        return <p className="text-center">Loading...</p>;
    }

    return (
        <>
            <div className="table-responsive text-nowrap text-base">
                {tickets?.length !== 0 ? (
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                            <tr >
                                <th>S/N</th>
                                <th>Date</th>
                                <th>Ticket No</th>
                                <th>Assigned By</th>
                                <th>Deadline</th>
                                <th>Message</th>
                                <th>Type</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-base">
                            {tickets.map((ticket, i) => (
                                <tr key={String(ticket._id)}>
                                    <td>{i + 1}</td>
                                    <td className="text-nowrap">{formatDate(ticket.createdAt)}</td>
                                    <td className="text-nowrap">{ticket.ticket_number}</td>
                                    <td className="text-nowrap">{ticket.assigned_by_name ? ticket.assigned_by_name : 'N/A'}</td>
                                    <td className="text-nowrap">
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
                                        className="uppercase text-nowrap"
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
                                        className="uppercase text-nowrap"
                                        style={{
                                            verticalAlign: 'middle',
                                        }}
                                    >
                                        <Badge
                                            value={capitalize(ticket.priority)}
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
                                            value={capitalize(ticket.status)}
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
                                                <Link
                                                    href={`/tickets/${ticket.ticket_number}`}
                                                    target="_blank"
                                                    className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                >
                                                    <SquareArrowOutUpRight
                                                        size={16}
                                                    />
                                                </Link>
                                                {canSubmit && (
                                                    <StatusEdit
                                                        ticketId={String(
                                                            ticket._id,
                                                        )}
                                                        currentStatus={
                                                            ticket.status
                                                        }
                                                        onUpdated={fetchTickets}
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
                    <table className="table border">
                        <tbody>
                            <tr key={0}>
                                <td className="align-center text-center text-wrap text-gray-400">
                                    No active tickets to show.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}
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

export default NotOverdueTickets;
