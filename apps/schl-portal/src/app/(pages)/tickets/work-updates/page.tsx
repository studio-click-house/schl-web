'use client';

import React, { useState } from 'react';
import WorkUpdatesTable from './components/Table';
import UserListPanel from './components/UserListPanel';

const TicketsWorkUpdatesPage: React.FC = () => {
    const [selectedUser, setSelectedUser] = useState<string>('');

    return (
        <div className="px-4 mt-8 mb-4">
            <div className="flex gap-4 items-start">
                <UserListPanel
                    selectedUser={selectedUser}
                    onSelect={setSelectedUser}
                />
                <div className="flex-1 w-full">
                    <WorkUpdatesTable selectedUser={selectedUser} />
                </div>
            </div>
        </div>
    );
};

export default TicketsWorkUpdatesPage;
export const dynamic = 'force-dynamic';
