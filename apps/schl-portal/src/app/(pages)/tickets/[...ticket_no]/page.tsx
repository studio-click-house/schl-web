import React from 'react';
import ViewTicket from './components/View';

const TicketView = ({ params }: { params: { ticket_no: string } }) => {
    const ticket_no = params.ticket_no || '';

    return (
        <>
            <div className="px-4 mt-8 mb-4">
                <ViewTicket ticket_no={ticket_no} />
            </div>
        </>
    );
};

export default TicketView;
