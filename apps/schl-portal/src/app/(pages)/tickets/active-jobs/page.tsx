import React from 'react';
import Table from './components/Table';

const TicketsWorkBoardPage = async () => {
    return (
        <>
            <div className="px-4 mt-8 mb-4">
                <Table />
            </div>
        </>
    );
};

export default TicketsWorkBoardPage;
export const dynamic = 'force-dynamic';
