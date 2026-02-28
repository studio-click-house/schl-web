'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    selectedUser: string;
    onSelect: (id: string) => void;
}

const UserListPanel: React.FC<Props> = ({ selectedUser, onSelect }) => {
    const authedFetchApi = useAuthedFetchApi();
    const [users, setUsers] = useState<FullyPopulatedUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const resp = await authedFetchApi<any>(
                    {
                        path: '/v1/user/search-users',
                        query: { paginated: false },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                    },
                );

                if (resp.ok) {
                    const raw = Array.isArray(resp.data)
                        ? resp.data
                        : resp.data?.items || [];
                    const filtered: FullyPopulatedUser[] = (raw as any[]).filter(u =>
                        hasPerm('ticket:submit_daily_work', u.role?.permissions || []),
                    );
                    setUsers(filtered);
                } else {
                    toastFetchError(resp);
                }
            } catch (err) {
                console.error(err);
                toast.error('Unable to load users');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [authedFetchApi]);

    const handleClick = (id: string) => {
        onSelect(id);
    };

    return (
        <aside className="w-1/4 max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm text-base">
            <div className="sticky top-0 bg-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 p-4">
                    USER SELECTION
                </h2>
            </div>
                <input
                    type="text"
                    placeholder="Search users…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 mb-2 border-y border-x-0 border-gray-300 text-md focus:outline-none focus:ring-0"
                />
           
            <ul className="divide-y divide-gray-100">
                <li>
                    <button
                        className={cn(
                            'w-full flex justify-between items-center text-left px-4 py-3 transition-colors',
                            selectedUser === ''
                                ? 'bg-blue-50 font-semibold text-blue-800'
                                : 'hover:bg-gray-100',
                        )}
                        onClick={() => handleClick('')}
                    >
                        <span>All</span>
                        <ChevronRight
                            className={cn('ml-2 transition-opacity',
                                selectedUser === '' ? 'opacity-100' : 'opacity-0',
                            )}
                            size={16}
                        />
                    </button>
                </li>
                {users
                    .filter(u => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                            u.employee.real_name.toLowerCase().includes(term) ||
                            u.employee.e_id.toLowerCase().includes(term)
                        );
                    })
                    .map(u => {
                        const idStr = String(u._id);
                        return (
                            <li key={idStr}>
                                <button
                                    className={cn(
                                        'w-full text-left px-4 py-3 transition-colors',
                                        selectedUser === idStr
                                            ? 'bg-blue-50 font-semibold text-blue-800'
                                            : 'hover:bg-gray-100',
                                    )}
                                    onClick={() => handleClick(idStr)}
                                >
                                    <span className="flex justify-between items-center w-full">
                                        <span>{u.employee.real_name} ({u.employee.e_id})</span>
                                        <ChevronRight
                                            className={cn('ml-2 transition-opacity',
                                                selectedUser === idStr ? 'opacity-100' : 'opacity-0',
                                            )}
                                            size={16}
                                        />
                                    </span>
                                </button>
                            </li>
                        );
                    })}
            </ul>
        </aside>
    );
};

export default UserListPanel;
