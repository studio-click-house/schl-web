import type { Permissions } from '@repo/common/types/permission.type';
import { NextResponse } from 'next/server';
import { auth as authMiddleware } from './auth';
import {
    allAuthorizedRoutes,
    AuthorizedRoute,
    isRouteAuthorized,
} from './route';
import { getClientIp } from './utils/ip';

const PUBLIC_ROUTES = ['/login', '/forbidden'];
const ROOT = '/login';
const FORBIDDEN_REDIRECT = '/forbidden';
const ALLOWED_IPS = process.env.ALLOWED_IPS?.split(',') || [];

// Using cached flattened route list from route.ts (includes containers & leaves)
const ALL_ROUTES: AuthorizedRoute[] = allAuthorizedRoutes;

export default authMiddleware((req: any) => {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;

    // --- User info ---
    const userPermissions: Permissions[] = req.auth?.user?.permissions || [];

    // --- Client IP ---
    const clientIp = getClientIp(req);

    console.log('ALLOWED_IPS', ALLOWED_IPS);
    console.log('clientIp', clientIp);

    // --- Route checks ---
    const isAuthenticated = !!req.auth;
    const isPublicRoute = PUBLIC_ROUTES.some(
        route => pathname === route || pathname.startsWith(route + '/'),
    );

    // 1. Protected routes
    if (!isPublicRoute) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL(ROOT, nextUrl));
        }

        if (
            clientIp &&
            !ALLOWED_IPS.includes(clientIp) &&
            !userPermissions.includes('settings:bypass_ip_restrictions')
        ) {
            return NextResponse.redirect(new URL(FORBIDDEN_REDIRECT, nextUrl));
        }

        const matchingRoute = ALL_ROUTES.filter(r => {
            if (r.href === '/') return pathname === '/';
            return pathname === r.href || pathname.startsWith(r.href + '/');
        }).sort((a, b) => b.href.length - a.href.length)[0];

        if (
            matchingRoute &&
            !isRouteAuthorized(matchingRoute, userPermissions)
        ) {
            return NextResponse.redirect(new URL(FORBIDDEN_REDIRECT, nextUrl));
        }
    }

    // 2. Forbidden page handling
    if (pathname === FORBIDDEN_REDIRECT) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL(ROOT, nextUrl));
        }

        const isIpAllowed =
            ALLOWED_IPS.includes(clientIp || '') ||
            userPermissions.includes('settings:bypass_ip_restrictions');

        const rootRoute = ALL_ROUTES.find(r => r.href === '/');
        const hasRootPermission =
            rootRoute && isRouteAuthorized(rootRoute, userPermissions);

        // Only redirect away from /forbidden to / if they actually have access to the root page,
        // otherwise they will get stuck in an infinite loop bouncing between / and /forbidden
        if (isIpAllowed && hasRootPermission) {
            return NextResponse.redirect(new URL('/', nextUrl));
        }

        // If they are on /forbidden and don't have access to /, let them stay on /forbidden
        return NextResponse.next();
    }

    // 3. Login page handling
    if (isAuthenticated && pathname === ROOT) {
        return NextResponse.redirect(new URL('/', nextUrl));
    }

    // 4. Allow request
    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|icon.ico|sitemap.xml|robots.txt|images).*)',
    ],
    runtime: 'nodejs',
};
