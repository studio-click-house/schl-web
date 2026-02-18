'use client';

import Badge from '@/components/Badge';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { formatDate } from '@repo/common/utils/date-helpers';
import DOMPurify from 'dompurify';
import parse, {
    DOMNode,
    domToReact,
    Element,
    HTMLReactParserOptions,
} from 'html-react-parser';
import { capitalize } from 'lodash';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ViewTicketProps {
    ticket_no: string;
}

interface Ticket {
    ticket_number: string;
    title: string;
    description: string;
    type: string;
    status: string;
    tags: string[];
    opened_by_name?: string;
    createdAt: string;
    updatedAt: string;
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

const ViewTicket: React.FC<ViewTicketProps> = props => {
    const ticket_no = decodeURIComponent(props.ticket_no);

    const [ticket, setTicket] = useState<Ticket>({
        ticket_number: '',
        title: '',
        description: '',
        type: '',
        status: '',
        tags: [],
        opened_by_name: '',
        createdAt: '',
        updatedAt: '',
    });
    const [isLoading, setIsLoading] = useState(false);

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

            const response = await authedFetchApi<Ticket>(
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
                        process.env.NEXT_PUBLIC_BASE_URL +
                            '/tickets/my-tickets',
                    );
                    return;
                }

                setTicket(ticketData);
                lastFetchedTicket.current = ticket_no;
            } else {
                toastFetchError(response, 'Failed to retrieve ticket');
                routerRef.current.replace(
                    process.env.NEXT_PUBLIC_BASE_URL + '/tickets/my-tickets',
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving the ticket');
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + '/tickets/my-tickets',
            );
        } finally {
            setIsLoading(false);
        }
    }, [authedFetchApi, ticket_no]);

    useEffect(() => {
        if (!ticket_no) {
            setIsLoading(false);
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + '/tickets/my-tickets',
            );
            return;
        }

        if (lastFetchedTicket.current === ticket_no) {
            return;
        }

        lastFetchedTicket.current = ticket_no;
        getTicket();
    }, [getTicket, ticket_no]);

    const typeBadgeClass =
        ticket.type === 'bug'
            ? 'bg-orange-600 text-white border-orange-600 me-0'
            : ticket.type === 'feature'
              ? 'bg-blue-600 text-white border-blue-600 me-0'
              : 'bg-green-600 text-white border-green-600 me-0';

    const statusBadgeClass =
        ticket.status === 'accepted'
            ? 'bg-green-600 text-white border-green-600 me-0'
            : ticket.status === 'rejected'
              ? 'bg-red-600 text-white border-red-600 me-0'
              : ticket.status === 'in-review'
                ? 'bg-amber-600 text-white border-amber-600 me-0'
                : 'bg-gray-600 text-white border-gray-600 me-0';

    return (
        <>
            {isLoading ? <p className="text-center">Loading...</p> : null}

            {!isLoading && (
                <div className="container mt-8 md:mt-12 mb-6 max-w-5xl">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
                        <div className="border-b border-gray-200 pb-4 md:pb-5">
                            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
                                {ticket.title}
                                <span className="text-gray-500 font-medium ml-2">
                                    [#{ticket.ticket_number}]
                                </span>
                            </h2>

                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                                <p>
                                    {ticket.createdAt
                                        ? formatDate(ticket.createdAt)
                                        : ''}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray-700">
                                        Opened By:
                                    </span>{' '}
                                    {ticket.opened_by_name ||
                                        'Unknown Employee'}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4 uppercase">
                                {ticket.type ? (
                                    <Badge
                                        value={capitalize(ticket.type)}
                                        className={typeBadgeClass}
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
                            <p className="text-xs font-semibold tracking-wider uppercase text-gray-500 mb-3">
                                Activity
                            </p>
                            <div className="pl-4 border-l-2 border-gray-200 text-gray-900 leading-7">
                                {parse(
                                    DOMPurify.sanitize(ticket.description),
                                    options,
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">Tags:</span>{' '}
                                {ticket.tags.length > 0
                                    ? ticket.tags.join(', ')
                                    : 'No tags'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ViewTicket;
