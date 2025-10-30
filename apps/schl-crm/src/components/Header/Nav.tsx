'use client';

import type { Permissions } from '@repo/common/types/permission.type';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import 'flowbite';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';
interface PropsType {
    msg?: string | undefined;
    className?: string | undefined;
}

const Nav: React.FC<PropsType> = props => {
    const { data: session } = useSession();

    const userPermissions = (session?.user.permissions || []) as Permissions[];

    const has = (perm: Permissions) => hasPerm(perm, userPermissions || []);

    const pathname = usePathname();

    // Use useEffect to safely initialize flowbite on the client
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('flowbite').then(module => {
                module.initFlowbite();
            });
        }
    }, []);

    let { msg = 'Welcome, ' + session?.user.provided_name + '!' } = props;

    return (
        <div
            className={cn(
                `w-full flex flex-row align-middle items-center justify-between bg-gray-900 px-5 text-white`,
                props.className,
            )}
        >
            <div className="flex flex-row">
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/' ? 'bg-primary' : 'hover:opacity-90',
                    )}
                    href={'/'}
                >
                    Statistics
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/call-reports'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('crm:view_reports') && 'hidden',
                    )}
                    href={'/call-reports'}
                >
                    Call Reports
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/lead-records'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('crm:view_leads') && 'hidden',
                    )}
                    href={'/lead-records'}
                >
                    Lead Records
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/pending-followups'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('crm:view_reports') && 'hidden',
                    )}
                    href={'/pending-followups'}
                >
                    Pending Followups
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname.includes('/notices')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('notice:view_notice') && 'hidden',
                    )}
                    href={'/notices'}
                >
                    Notices
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/rules-and-regulations'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                    )}
                    href={'/rules-and-regulations'}
                >
                    Rules & Regulations
                </Link>
                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname == '/email-verify'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                    )}
                    href={'/email-verify'}
                >
                    Email Verify
                </Link>
            </div>

            <span className="max-lg:hidden">{msg}</span>
        </div>
    );
};
export default Nav;
