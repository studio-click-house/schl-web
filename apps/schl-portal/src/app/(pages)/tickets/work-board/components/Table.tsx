'use client';

import { hasPerm } from '@repo/common/utils/permission-check';
import { initFlowbite } from 'flowbite';
import { useSession } from 'next-auth/react';
import React, { useEffect, useMemo } from 'react';

import NotOverdueTickets from './NotOverdueTickets';
import OverdueTickets from './OverdueTickets';

const Table = () => {
    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    useEffect(() => {
        // some of the tables use flowbite components, ensure it's initialized
        if (typeof window !== 'undefined') {
            initFlowbite();
        }
    }, []);

    // only users who can create tickets or submit daily work may see this board
    const canView = hasPerm('ticket:submit_daily_work', userPermissions);

    if (!canView) {
        return (
            <p className="text-center text-red-600">
                You do not have access to this page.
            </p>
        );
    }

    return (
        <>
            <div className="gap-8 flex flex-col">
                <div>
                    <h3 className="text-lg uppercase tracking-wider font-semibold underline flex justify-start mb-2">
                        Active Tickets
                    </h3>
                    <NotOverdueTickets />
                </div>
                <div>
                    <h3 className="text-lg uppercase tracking-wider font-semibold underline flex justify-start mb-2">
                        Overdue Tickets
                    </h3>
                    <OverdueTickets />
                </div>
            </div>
        </>
    );
};

export default Table;
