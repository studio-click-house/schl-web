import type { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string | null {
    // In development, we can assume localhost since we're likely using a proxy or similar setup
    if (process.env.NODE_ENV === 'development') {
        return '127.0.0.1';
    }

    // headers are case-insensitive; NextRequest exposes them lower-cased
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
        const first = xff.split(',')[0];
        if (first) return first.trim();
    }

    const xr = req.headers.get('x-real-ip');
    if (xr) return xr.trim();

    // nodejs runtime only
    if ('socket' in req && (req as any).socket?.remoteAddress) {
        // remove IPv4-mapped IPv6 prefix if present
        return ((req as any).socket.remoteAddress as string).replace(
            /^::ffff:/,
            '',
        );
    }

    return null;
}
