'use client';

import type { Permissions } from '@repo/common/types/permission.type';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import {
    BookOpen,
    ChartBarBig,
    ChevronDown,
    Clock,
    LogOutIcon,
    Mail,
    Megaphone,
    Menu,
    Phone,
    UserCog,
    Users,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Drawer from '../Drawer';

interface PropsType {
    className?: string | undefined;
    LogoutAction: () => Promise<void>;
}
const Sidebar: React.FC<PropsType> = props => {
    const [isOpen, setIsOpen] = useState(false);

    const { data: session } = useSession();

    const userPermissions = (session?.user.permissions || []) as Permissions[];
    // Permission helpers
    const has = (perm: Permissions) => hasPerm(perm, userPermissions);

    const pathname = usePathname();

    const router = useRouter();

    const navLogoutHandler = async () => {
        await props.LogoutAction();
        router.push('/login');
    };

    // Use useEffect to safely initialize flowbite on the client
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('flowbite').then(module => {
                module.initFlowbite();
            });
        }
    }, []);

    return (
        <div className={props.className}>
            <label
                htmlFor="sidebar-toggle"
                className="font-bold cursor-pointer relative top-1"
                onClick={() => setIsOpen(true)}
            >
                <Menu size={40} />
            </label>

            <Drawer title="Menu" isOpen={isOpen} setIsOpen={setIsOpen}>
                <nav className="flex flex-col space-y-1 overflow-y-scroll">
                    <Link
                        href="/"
                        className={cn(
                            'p-4 flex items-center',
                            pathname == '/'
                                ? 'bg-primary text-white'
                                : 'hover:bg-gray-100',
                        )}
                    >
                        <ChartBarBig className="mr-2 w-6 h-6" />
                        Statistics
                    </Link>
                    {has('crm:view_reports') && (
                        <Link
                            href="/call-reports"
                            className={cn(
                                'p-4 flex items-center',
                                pathname == '/call-reports'
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-gray-100',
                            )}
                        >
                            <Phone className="w-6 h-6 mr-2" />
                            Call Reports
                        </Link>
                    )}
                    {has('crm:view_leads') && (
                        <Link
                            href="/lead-records"
                            className={cn(
                                'p-4 flex items-center',
                                pathname == '/lead-records'
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-gray-100',
                            )}
                        >
                            <Users className="w-6 h-6 mr-2" />
                            Lead Records
                        </Link>
                    )}
                    {has('crm:view_reports') && (
                        <Link
                            href="/pending-followups"
                            className={cn(
                                'p-4 flex items-center',
                                pathname == '/pending-followups'
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-gray-100',
                            )}
                        >
                            <Clock className="w-6 h-6 mr-2" />
                            Pending Followups
                        </Link>
                    )}
                    {has('notice:view_notice') && (
                        <Link
                            href="/notices"
                            className={cn(
                                'p-4 flex items-center',
                                pathname.includes('/notices')
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-gray-100',
                            )}
                        >
                            <Megaphone className="w-6 h-6 mr-2" />
                            Notices
                        </Link>
                    )}
                    <Link
                        href="/rules-and-regulations"
                        className={cn(
                            'p-4 flex items-center',
                            pathname == '/rules-and-regulations'
                                ? 'bg-primary text-white'
                                : 'hover:bg-gray-100',
                        )}
                    >
                        <BookOpen className="w-6 h-6 mr-2" />
                        Rules & Regulations
                    </Link>
                    <Link
                        href="/email-verify"
                        className={cn(
                            'p-4 flex items-center',
                            pathname == '/email-verify'
                                ? 'bg-primary text-white'
                                : 'hover:bg-gray-100',
                        )}
                    >
                        <Mail className="w-6 h-6 mr-2" />
                        Email Verify
                    </Link>
                    <hr />
                    {has('settings:view_page') && (
                        <Link
                            href="/my-account"
                            className={cn(
                                'p-4 flex items-center',
                                pathname.includes('/my-account')
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-gray-100',
                            )}
                        >
                            <UserCog className="w-6 h-6 mr-2" />
                            <span>Account</span>
                        </Link>
                    )}

                    {/* Logout */}
                    <span
                        onClick={navLogoutHandler}
                        className={cn(
                            'p-4 flex items-center hover:bg-gray-100 hover:cursor-pointer',
                        )}
                    >
                        <LogOutIcon className="w-6 h-6 mr-2" />
                        Logout
                    </span>
                </nav>
            </Drawer>
        </div>
    );
};

export default Sidebar;
