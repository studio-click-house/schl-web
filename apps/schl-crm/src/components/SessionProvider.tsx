'use client';

import type { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import React from 'react';

type SessionProviderProps = {
    children: React.ReactNode;
    session?: Session | null;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
};

export default function SessionProvider({
    children,
    session,
    refetchInterval = 60,
    refetchOnWindowFocus = true,
}: SessionProviderProps) {
    return (
        <NextAuthSessionProvider
            session={session}
            refetchInterval={refetchInterval}
            refetchOnWindowFocus={refetchOnWindowFocus}
        >
            {children}
        </NextAuthSessionProvider>
    );
}
