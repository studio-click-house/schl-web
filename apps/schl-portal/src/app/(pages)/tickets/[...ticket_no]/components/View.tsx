'use client';

import Badge from '@/components/Badge';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import createDOMPurify from 'dompurify';
import parse, {
    DOMNode,
    domToReact,
    Element,
    HTMLReactParserOptions,
} from 'html-react-parser';
import { capitalize } from 'lodash';
import { ClockFading } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import {
    getTicketPriorityBadgeClass,
    getTicketStatusBadgeClass,
    getTicketTypeBadgeClass,
} from '../../all-tickets/components/ticket-badge.helper';

interface ViewTicketProps {
    ticket_no: string;
}

interface TicketData extends TicketDocument {
    created_by_name?: string; 
}
 

const options: HTMLReactParserOptions = {
    replace(domNode) {
        if (domNode instanceof Element && domNode.attribs) {
            const { name, children } = domNode;

            if (name === 'ul') {
                return (
                    <ul className="list-disc ml-5">
                        {domToReact(children as DOMNode[], options)}
                    </ul>
                );
            }

            if (name === 'ol') {
                return (
                    <ol className="list-decimal ml-5">
                        {domToReact(children as DOMNode[], options)}
                    </ol>
                );
            }

            if (name === 'p') {
                const parentIsLi =
                    domNode.parent &&
                    domNode.parent instanceof Element &&
                    domNode.parent.name === 'li';

                return (
                    <p className={parentIsLi ? '' : 'mb-4'}>
                        {domToReact(children as DOMNode[], options)}
                    </p>
                );
            }

            if (name === 'a') {
                return (
                    <a
                        href={domNode.attribs.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                    >
                        {domToReact(children as DOMNode[], options)}
                    </a>
                );
            }
        }
    },
};

const sanitizeHtml = (html: string): string => {
    if (typeof window === 'undefined') {
        return html;
    }

    return createDOMPurify(window).sanitize(html);
};

const ViewTicket: React.FC<ViewTicketProps> = props => {
    const ticket_no = decodeURIComponent(props.ticket_no);

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const canReviewTicket = useMemo(
        () => hasPerm('ticket:review_works', userPermissions),
        [userPermissions],
    );

    const canSubmitWork = useMemo(
        () => hasPerm('ticket:submit_daily_work', userPermissions),
        [userPermissions],
    );

    const redirectBase = useMemo(() => {
        return hasPerm('ticket:review_works', userPermissions)
            ? '/tickets/all-tickets'
            : '/tickets/my-tickets';
    }, [userPermissions]);

    const router = useRouter();
    const routerRef = useRef(router);

    useEffect(() => {
        routerRef.current = router;
    }, [router]);

    const authedFetchApi = useAuthedFetchApi();
    const lastFetchedTicket = useRef<string | null>(null);

    const getTicket = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await authedFetchApi<TicketData>(
                {
                    path: '/v1/ticket/get-ticket',
                    query: {
                        ticketNo: ticket_no,
                    },
                },
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (response.ok) {
                const ticketData = response.data;

                if (!ticketData) {
                    toast.error('Ticket not found', {
                        id: 'ticket-error',
                    });
                    routerRef.current.replace(
                        process.env.NEXT_PUBLIC_BASE_URL + redirectBase,
                    );
                    return;
                }

                setTicket(ticketData);
                lastFetchedTicket.current = ticket_no;
            } else {
                toastFetchError(response, 'Failed to retrieve ticket');
                routerRef.current.replace(
                    process.env.NEXT_PUBLIC_BASE_URL + redirectBase,
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving the ticket');
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + redirectBase,
            );
        } finally {
            setIsLoading(false);
        }
    }, [authedFetchApi, ticket_no]);

    useEffect(() => {
        if (!ticket_no) {
            setIsLoading(false);
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + redirectBase,
            );
            return;
        }

        if (lastFetchedTicket.current === ticket_no) {
            return;
        }

        lastFetchedTicket.current = ticket_no;
        getTicket();
    }, [getTicket, ticket_no]);

    const typeBadgeClass = ticket ? getTicketTypeBadgeClass(ticket.type) : '';
    const statusBadgeClass = ticket
        ? getTicketStatusBadgeClass(ticket.status)
        : '';

    if (isLoading || !ticket) {
        return <p className="text-center">Loading...</p>;
    }
    return (
        <>
            {ticket && (
                <div className="container mt-8 md:mt-12 mb-6 max-w-5xl">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
                        <div className="border-b border-gray-200 pb-4 md:pb-5">
                            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
                                {ticket.title}
                                <span className="text-gray-500 font-medium text-base ml-2">
                                    [#{ticket.ticket_number}]
                                </span>
                            </h2>

                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                                <p className="text-sm text-gray-700 mt-1">
                                    {`${formatDate(ticket.createdAt)} • ${ticket.created_by_name}`}
                                </p>
                            </div>
                            {ticket.deadline &&
                                (canReviewTicket || canSubmitWork) && (
                                    <div className="flex items-center text-center gap-1 mt-2 text-sm text-red-600">
                                        <ClockFading
                                            size={18}
                                            className="me-1"
                                        />
                                        <span>
                                            {ticket.deadline
                                                ? `${formatDate(ticket.deadline)} | ${formatTime(
                                                      formatTimestamp(
                                                          ticket.deadline,
                                                      ).time,
                                                  )}`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                )}

                            <div className="flex flex-wrap gap-2 mt-4 uppercase">
                                {ticket.type ? (
                                    <Badge
                                        value={capitalize(ticket.type)}
                                        className={typeBadgeClass}
                                    />
                                ) : null}
                                {ticket.priority ? (
                                    <Badge
                                        value={capitalize(ticket.priority)}
                                        className={getTicketPriorityBadgeClass(
                                            ticket.priority,
                                        )}
                                    />
                                ) : null}
                                {ticket.status ? (
                                    <Badge
                                        value={capitalize(ticket.status)}
                                        className={statusBadgeClass}
                                    />
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-5 md:mt-6">
                            <div className="py-1 text-gray-900 leading-7">
                                {parse(
                                    sanitizeHtml(ticket.description),
                                    options,
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ViewTicket;
