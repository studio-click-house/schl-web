'use client';

import type { Permissions } from '@repo/common/types/permission.type';

import { cn } from '@repo/common/utils/general-utils';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import 'flowbite';
import { BriefcaseBusiness, ChevronDown, ChevronRight } from 'lucide-react';
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

    const pathname = usePathname();

    const userPermissions = (session?.user.permissions || []) as Permissions[];

    // Local permission helpers bound to current user's permissions
    const has = (perm: Permissions) => hasPerm(perm, userPermissions || []);
    const hasAny = (perms: Permissions[]) =>
        hasAnyPerm(perms, userPermissions || []);

    // Use useEffect to safely initialize flowbite on the client
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('flowbite').then(module => {
                module.initFlowbite();
            });
        }
    }, []);

    const { msg = 'Welcome, ' + session?.user.real_name + '!' } = props;

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
                        pathname === '/' ? 'bg-primary' : 'hover:opacity-90',
                        !has('task:view_page') && 'hidden',
                    )}
                    href={'/'}
                >
                    Tasks
                </Link>

                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname === '/browse'
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('browse:view_page') && 'hidden',
                    )}
                    href={'/browse'}
                >
                    Browse
                </Link>

                <span
                    role="button"
                    id="adminDropdownButton"
                    data-dropdown-toggle="adminDropdown"
                    data-dropdown-trigger="hover"
                    className={cn(
                        'py-3 px-5 select-none',
                        pathname === '/admin' || pathname.startsWith('/admin/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('admin:view_page') && 'hidden',
                    )}
                >
                    <span className="flex gap-1 items-center justify-between">
                        <span>Admin</span>
                        <ChevronDown size={17} />
                    </span>
                </span>

                <div
                    id="adminDropdown"
                    className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                    suppressHydrationWarning
                >
                    <ul
                        className="py-2 text-white"
                        aria-labelledby="adminDropdownButton"
                    >
                        <li
                            className={cn(
                                !has('admin:create_employee') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/admin/employees'}
                            >
                                Employee
                            </Link>
                        </li>

                        <li
                            className={cn(
                                !has('admin:create_task') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/admin/tasks'}
                            >
                                Task
                            </Link>
                        </li>

                        <li
                            className={cn(
                                !hasAny([
                                    'admin:manage_client',
                                    'admin:create_client',
                                ]) && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/admin/clients'}
                            >
                                Clients
                            </Link>
                        </li>

                        <li
                            className={cn(
                                !has('admin:check_approvals') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/admin/approvals'}
                            >
                                Approvals
                            </Link>
                        </li>

                        <li
                            className={cn(
                                !hasAny([
                                    'admin:create_role',
                                    'admin:delete_role',
                                    'admin:edit_user',
                                    'admin:delete_user_approval',
                                    'admin:view_device_user',
                                ]) && 'hidden',
                            )}
                        >
                            <span
                                role="button"
                                id="adminAccessDropdownButton"
                                data-dropdown-toggle="adminAccessDropdown"
                                data-dropdown-trigger="hover"
                                data-dropdown-placement="right-start"
                                className="block px-4 py-2 hover:bg-primary"
                            >
                                <span className="flex gap-1 items-end text-wrap align-bottom justify-between">
                                    <span>Access & Permissions</span>
                                    <ChevronRight size={17} />
                                </span>
                            </span>

                            <div
                                id="adminAccessDropdown"
                                className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                                suppressHydrationWarning
                            >
                                <ul
                                    className="py-2 text-white"
                                    aria-labelledby="adminAccessDropdownButton"
                                >
                                    <li
                                        className={cn(
                                            !hasAny([
                                                'admin:edit_user',
                                                'admin:delete_user_approval',
                                            ]) && 'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={'/admin/users'}
                                        >
                                            Users
                                        </Link>
                                    </li>
                                    <li
                                        className={cn(
                                            !hasAny([
                                                'admin:create_role',
                                                'admin:delete_role',
                                            ]) && 'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={'/admin/roles'}
                                        >
                                            Roles
                                        </Link>
                                    </li>
                                    <li
                                        className={cn(
                                            !has('admin:view_device_user') &&
                                                'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={'/admin/device-users'}
                                        >
                                            Device Users
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </li>

                        <li
                            className={cn(
                                !has('notice:send_notice') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/admin/notices'}
                            >
                                Notice
                            </Link>
                        </li>
                    </ul>
                </div>

                <span
                    role="button"
                    id="accountancyDropdownButton"
                    data-dropdown-toggle="accountancyDropdown"
                    data-dropdown-trigger="hover"
                    className={cn(
                        'py-3 px-5 select-none',
                        pathname === '/accountancy' ||
                            pathname.startsWith('/accountancy/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('accountancy:view_page') && 'hidden',
                    )}
                >
                    <span className="flex gap-1 items-center justify-between">
                        <span>Accountancy</span>
                        <ChevronDown size={17} />
                    </span>
                </span>

                <div
                    id="accountancyDropdown"
                    className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                    suppressHydrationWarning
                >
                    <ul
                        className="py-2 text-white"
                        aria-labelledby="accountancyDropdownButton"
                    >
                        <li
                            className={cn(
                                !has('accountancy:manage_employee') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/accountancy/employees'}
                            >
                                Employees
                            </Link>
                        </li>

                        <li>
                            <span
                                role="button"
                                id="accountancyInvoicesDropdownButton"
                                data-dropdown-toggle="accountancyInvoicesDropdown"
                                data-dropdown-trigger="hover"
                                data-dropdown-placement="right-start"
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                    !hasAny([
                                        'accountancy:create_invoice',
                                        'accountancy:download_invoice',
                                    ]) && 'hidden',
                                )}
                            >
                                <span className="flex gap-1 items-end align-bottom justify-between">
                                    <span>Invoices</span>
                                    <ChevronRight size={17} />
                                </span>
                            </span>

                            <div
                                id="accountancyInvoicesDropdown"
                                className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                                suppressHydrationWarning
                            >
                                <ul
                                    className="py-2 text-white"
                                    aria-labelledby="accountancyInvoicesDropdownButton"
                                >
                                    <li
                                        className={cn(
                                            !has(
                                                'accountancy:create_invoice',
                                            ) && 'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={
                                                '/accountancy/invoices/create-invoice'
                                            }
                                        >
                                            Create New
                                        </Link>
                                    </li>
                                    <li
                                        className={cn(
                                            !has(
                                                'accountancy:download_invoice',
                                            ) && 'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={'/accountancy/invoices'}
                                        >
                                            View All
                                        </Link>
                                    </li>
                                    <li
                                        className={cn(
                                            !has(
                                                'accountancy:create_invoice',
                                            ) && 'hidden',
                                        )}
                                    >
                                        <Link
                                            className={cn(
                                                'block px-4 py-2 hover:bg-primary',
                                            )}
                                            href={
                                                '/accountancy/invoices/invoice-tracker'
                                            }
                                            target="_blank"
                                        >
                                            Track Invoices
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </li>
                    </ul>
                </div>

                <span
                    role="button"
                    id="crmDropdownButton"
                    data-dropdown-toggle="crmDropdown"
                    data-dropdown-trigger="hover"
                    className={cn(
                        'py-3 px-5 select-none',
                        pathname === '/crm' || pathname.startsWith('/crm/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !hasAny([
                            'crm:view_reports',
                            'crm:check_client_request',
                        ]) && 'hidden',
                    )}
                >
                    <span className="flex gap-1 items-center justify-between">
                        <span>CRM</span>
                        <ChevronDown size={17} />
                    </span>
                </span>

                <div
                    id="crmDropdown"
                    className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                    suppressHydrationWarning
                >
                    <ul
                        className="py-2 text-white"
                        aria-labelledby="crmDropdownButton"
                    >
                        <li
                            className={cn(
                                !has('crm:view_crm_stats') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/crm/statistics'}
                            >
                                Statistics
                            </Link>
                        </li>
                        <li
                            className={cn(!has('crm:view_reports') && 'hidden')}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/crm/trial-clients'}
                            >
                                Trial Clients
                            </Link>
                        </li>
                        <li
                            className={cn(!has('crm:view_reports') && 'hidden')}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/crm/pending-prospects'}
                            >
                                Pending Prospects
                            </Link>
                        </li>
                        <li
                            className={cn(!has('crm:view_reports') && 'hidden')}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/crm/potential-leads'}
                            >
                                Potential Leads
                            </Link>
                        </li>
                        <li
                            className={cn(
                                !has('crm:check_client_request') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/crm/client-approvals'}
                            >
                                Client Approvals
                            </Link>
                        </li>
                    </ul>
                </div>

                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname === '/file-flow' ||
                            pathname.startsWith('/file-flow/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('fileflow:view_page') && 'hidden',
                    )}
                    href={'/file-flow'}
                >
                    File Flow
                </Link>

                <span
                    role="button"
                    id="scheduleDropdownButton"
                    data-dropdown-toggle="scheduleDropdown"
                    data-dropdown-trigger="hover"
                    className={cn(
                        'py-3 px-5 select-none',
                        pathname === '/work-schedule' ||
                            pathname.startsWith('/work-schedule/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !hasAny([
                            'schedule:view_page',
                            'schedule:create_schedule',
                        ]) && 'hidden',
                    )}
                >
                    <span className="flex gap-1 items-center justify-between">
                        <span>Work Schedule</span>
                        <ChevronDown size={17} />
                    </span>
                </span>

                <div
                    id="scheduleDropdown"
                    className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                    suppressHydrationWarning
                >
                    <ul
                        className="py-2 text-white"
                        aria-labelledby="scheduleDropdownButton"
                    >
                        <li
                            className={cn(
                                !has('schedule:create_schedule') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/work-schedule/schedule-task'}
                            >
                                Schedule Task
                            </Link>
                        </li>
                        <li
                            className={cn(
                                !has('schedule:view_page') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/work-schedule/view-schedule'}
                            >
                                View Schedule
                            </Link>
                        </li>
                    </ul>
                </div>

                <Link
                    className={cn(
                        'py-3 px-5',
                        pathname === '/notices' ||
                            pathname.startsWith('/notices/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !has('notice:view_notice') && 'hidden',
                    )}
                    href={'/notices'}
                >
                    Notices
                </Link>

                <span
                    role="button"
                    id="ticketsDropdownButton"
                    data-dropdown-toggle="ticketsDropdown"
                    data-dropdown-trigger="hover"
                    className={cn(
                        'py-3 px-5 select-none',
                        pathname === '/tickets' ||
                            pathname.startsWith('/tickets/')
                            ? 'bg-primary'
                            : 'hover:opacity-90',
                        !hasAny([
                            'ticket:create_ticket',
                            'ticket:review_works',
                            'ticket:submit_daily_work',
                        ]) && 'hidden',
                    )}
                >
                    <span className="flex gap-1 items-center justify-between">
                        <span>Tickets</span>
                        <ChevronDown size={17} />
                    </span>
                </span>

                <div
                    id="ticketsDropdown"
                    className="z-10 hidden bg-gray-900 divide-y divide-gray-100 rounded-md shadow w-44"
                    suppressHydrationWarning
                >
                    <ul
                        className="py-2 text-white"
                        aria-labelledby="ticketsDropdownButton"
                    >
                        <li
                            className={cn(
                                !has('ticket:create_ticket') && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/tickets/create'}
                            >
                                Create Ticket
                            </Link>
                        </li>
                        <li
                            className={cn(
                                !hasAny([
                                    'ticket:create_ticket',
                                    'ticket:review_works',
                                ]) && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/tickets/all-tickets'}
                            >
                                All Tickets
                            </Link>
                        </li>
                        <li
                            className={cn(
                                !hasAny([
                                    'ticket:submit_daily_work',
                                    'ticket:review_works',
                                ]) && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/tickets/work-board'}
                            >
                                Work Board
                            </Link>
                        </li>
                                                <li
                            className={cn(
                                !has(
                                    'ticket:review_works',
                                ) && 'hidden',
                            )}
                        >
                            <Link
                                className={cn(
                                    'block px-4 py-2 hover:bg-primary',
                                )}
                                href={'/tickets/work-updates'}
                            >
                                Work Updates
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <span className="max-lg:hidden">{msg}</span>
        </div>
    );
};
export default Nav;
