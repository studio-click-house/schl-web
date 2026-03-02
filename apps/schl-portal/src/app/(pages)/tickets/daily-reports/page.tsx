'use client';

import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useMemo, useState } from 'react';
import DailyReportsTable from './components/Table';
import UserListPanel from './components/UserListPanel';

const TicketsDailyReportsPage: React.FC = () => {
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [selectedUser, setSelectedUser] = useState<string>(
        hasPerm('ticket:review_works', userPermissions)
            ? ''
            : session?.user.db_id || '',
    );

    return (
        <div className="px-4 mt-8 mb-4">
            <div className="flex gap-4 items-start">
                {hasPerm('ticket:review_works', userPermissions) && (
                    <UserListPanel
                        selectedUser={selectedUser}
                        onSelect={setSelectedUser}
                    />
                )}
                <div className="flex-1 w-full">
                    <DailyReportsTable selectedUser={selectedUser} />
                </div>
            </div>
        </div>
    );
};

export default TicketsDailyReportsPage;
