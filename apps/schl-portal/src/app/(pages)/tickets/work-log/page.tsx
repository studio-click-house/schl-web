import { fetchApiWithServerAuth } from '@/lib/api-server';
import { TicketDocument } from '@repo/common/models/ticket.schema';
import React, { Suspense } from 'react';
import InputForm from './components/Form';

const getAllTickets = async (): Promise<TicketDocument[] | undefined> => {
    try {
        const response = await fetchApiWithServerAuth<TicketDocument[]>(
            {
                path: '/v1/ticket/work-log-tickets',
            },
            {
                method: 'GET',
                headers: { Accept: '*/*', 'Content-Type': 'application/json' },
                cache: 'no-store',
            },
        );

        if (response.ok) {
            return response.data as TicketDocument[];
        }
        console.error('Unable to fetch tickets for work-log page');
    } catch (e) {
        console.error(e);
    }
};

const WorkLogPage = async () => {
    const tickets = await getAllTickets();

    return (
        <div className="px-4 mt-8 mb-4 container md:w-[70vw] mx-auto">
            <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                Create Work Log
            </h1>

            <Suspense fallback={<p className="text-center">Loading...</p>}>
                <InputForm ticketsData={tickets || []} />
            </Suspense>
        </div>
    );
};

export default WorkLogPage;
