import type { CookieOptions } from 'express';

interface HostContext {
    originHeader?: string;
    hostHeader?: string;
    requestHostname?: string;
    baseUrl?: string;
}

const parseHostname = (raw?: string | null): string => {
    if (!raw) {
        return '';
    }

    try {
        if (!raw.includes('://')) {
            return raw.split(':').shift() || '';
        }

        return new URL(raw).hostname;
    } catch {
        return raw.split(':').shift() || '';
    }
};

const getApexDomain = (host: string): string | undefined => {
    if (!host) {
        return undefined;
    }

    const segments = host.split('.').filter(Boolean);

    if (segments.length < 2) {
        return undefined;
    }

    return segments.slice(-2).join('.');
};

export const buildVerifyCookieOptions = (
    context: HostContext,
): { options: CookieOptions; originHost: string; requestHost: string } => {
    const originHost = parseHostname(context.originHeader);
    const fallbackHost = context.requestHostname || context.hostHeader;
    const requestHost = parseHostname(fallbackHost);

    const isLocalhostRequest =
        originHost.includes('localhost') || requestHost.includes('localhost');

    const options: CookieOptions = {
        path: '/',
        httpOnly: true,
        maxAge: 10_000,
        sameSite: isLocalhostRequest ? 'lax' : 'none',
        secure: !isLocalhostRequest,
    };

    if (!isLocalhostRequest) {
        const baseHost = parseHostname(context.baseUrl);
        const apexDomain = getApexDomain(baseHost || '');

        if (
            apexDomain &&
            originHost.endsWith(apexDomain) &&
            requestHost.endsWith(apexDomain)
        ) {
            options.domain = `.${apexDomain}`;
        }
    }

    return { options, originHost, requestHost };
};
