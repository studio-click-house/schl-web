// Central definition of application routes and the permissions required to view / access them.

import { Permissions } from '@repo/common/types/permission.type';

export interface AuthorizedRoute {
    href: string; // URL path (no trailing slash unless root)
    label: string; // Human readable label
    permissions: Permissions[]; // Permissions ANY of which allow access (logical OR)
    children?: AuthorizedRoute[]; // Nested routes (dropdown items / sub-menus)
    notes?: string; // Optional notes / rationale
}

/**
 * Check if a user permission set authorizes a route (OR semantics across route.permissions)
 */
export function isRouteAuthorized(
    route: AuthorizedRoute,
    userPermissions: string[] | undefined | null,
): boolean {
    if (!route.permissions.length) return true; // public / inherited
    if (!userPermissions) return false;
    return route.permissions.some(p => userPermissions.includes(p));
}

/**
 * Top-level (navigation bar) authorized routes. Some entries (like Admin / Accountancy / CRM) act
 * as menu containers and have children.
 * Routes with multiple permissions require any one of them (OR logic).
 */
export const authorizedRoutes: AuthorizedRoute[] = [
    // Root tasks page
    { href: '/', label: 'Tasks', permissions: [] },

    // Reports
    {
        href: '/call-reports',
        label: 'Call Reports',
        permissions: ['crm:view_reports'],
    },

    // Leads
    {
        href: '/lead-records',
        label: 'Lead Records',
        permissions: ['crm:view_leads'],
    },

    // Followups
    {
        href: '/pending-followups',
        label: 'Pending Followups',
        permissions: ['crm:view_reports'],
    },

    {
        href: '/notices',
        label: 'Notices',
        permissions: ['notice:view_notice'],
    },

    // Trial Clients
    {
        href: '/trial-clients',
        label: 'Trial Clients',
        permissions: ['crm:view_reports'],
    },

    // Stale Clients
    {
        href: '/stale-clients',
        label: 'Stale Clients',
        permissions: ['crm:view_reports'],
    },

    // Ideal (Potential) Prospects
    {
        href: '/ideal-prospects',
        label: 'Ideal Prospects',
        permissions: ['crm:view_reports'],
    },

    // Regular Clients
    {
        href: '/regular-clients',
        label: 'Regular Clients',
        permissions: ['crm:send_client_request'],
    },

    // Account Settings
    {
        href: '/my-account',
        label: 'My Account',
        permissions: ['settings:view_page'],
        children: [
            {
                href: '/my-account/change-password',
                label: 'Change Password',
                permissions: ['settings:change_password'],
            },
        ],
    },
];

/**
 * Flat list that includes container routes (menus) as well as leaves.
 * Cached once at module evaluation.
 */
export const allAuthorizedRoutes: AuthorizedRoute[] = (() => {
    const out: AuthorizedRoute[] = [];
    const walk = (r: AuthorizedRoute) => {
        out.push({ ...r, children: undefined });
        r.children?.forEach(walk);
    };
    authorizedRoutes.forEach(walk);
    return out;
})();

export default authorizedRoutes;
