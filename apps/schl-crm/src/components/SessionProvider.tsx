'use client';

import type { Session } from 'next-auth';
import {
    SessionProvider as NextAuthSessionProvider,
    useSession,
} from 'next-auth/react';
import React, { useEffect, useRef } from 'react';

type SessionProviderProps = {
    children: React.ReactNode;
    session?: Session | null;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    refreshBufferSeconds?: number;
};

const DEFAULT_REFRESH_BUFFER_SECONDS = 120;

const SessionAutoRefresher: React.FC<{
    bufferSeconds: number;
}> = ({ bufferSeconds }) => {
    const { data: session, status, update } = useSession();
    const refreshTimeoutRef = useRef<number>();
    const lastImmediateRefreshRef = useRef<number>();

    useEffect(() => {
        const timeoutId = refreshTimeoutRef.current;
        if (timeoutId) {
            clearTimeout(timeoutId);
            refreshTimeoutRef.current = undefined;
        }

        if (status !== 'authenticated') return;

        const expires = session?.accessTokenExpires;
        if (!expires) return;

        const expiresAt = Number(expires);
        if (!Number.isFinite(expiresAt)) return;

        const refreshInMs = expiresAt - bufferSeconds * 1000 - Date.now();

        if (refreshInMs <= 0) {
            if (lastImmediateRefreshRef.current === expiresAt) return;
            lastImmediateRefreshRef.current = expiresAt;
            void update();
            return;
        }

        const id = window.setTimeout(() => {
            lastImmediateRefreshRef.current = undefined;
            void update();
        }, refreshInMs);
        refreshTimeoutRef.current = id;

        return () => {
            clearTimeout(id);
            refreshTimeoutRef.current = undefined;
        };
    }, [bufferSeconds, session?.accessTokenExpires, status, update]);

    return null;
};

export default function SessionProvider({
    children,
    session,
    refetchInterval = 60,
    refetchOnWindowFocus = true,
    refreshBufferSeconds = DEFAULT_REFRESH_BUFFER_SECONDS,
}: SessionProviderProps) {
    return (
        <NextAuthSessionProvider
            session={session}
            refetchInterval={refetchInterval}
            refetchOnWindowFocus={refetchOnWindowFocus}
        >
            <SessionAutoRefresher bufferSeconds={refreshBufferSeconds} />
            {children}
        </NextAuthSessionProvider>
    );
}
