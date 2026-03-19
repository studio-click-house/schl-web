import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe auth configuration shared between middleware and auth.ts.
 *
 * Heavy dependencies (jsonwebtoken) and token-signing / refresh logic live
 * exclusively in auth.ts so the middleware bundle stays free of Node-only APIs.
 */

// Session lifetime — exported for reuse in auth.ts
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const authConfig: NextAuthConfig = {
    trustHost: true,
    session: {
        strategy: 'jwt', // session stored in secure, HttpOnly JWT cookie
        maxAge: SESSION_MAX_AGE_SECONDS,
    },
    pages: {
        error: '/login',
        signIn: '/login',
    },
    callbacks: {
        /**
         * Read-only JWT callback.
         * Token fields are populated during sign-in by auth.ts;
         * the middleware instance only needs to pass them through.
         */
        async jwt({ token }) {
            return token;
        },
        /** Map token fields → session so middleware can read req.auth.user */
        async session({ session, token }: { session: any; token: any }) {
            if (token) {
                session.user = {
                    db_id: token.db_id,
                    db_role_id: token.db_role_id,
                    real_name: token.real_name,
                    provided_name: token.provided_name,
                    permissions: token.permissions,
                    e_id: token.e_id,
                    department: token.department,
                };
                session.accessToken = token.accessToken;
                session.accessTokenExpires = token.accessTokenExpires;
                session.error = token.error;
            }
            return session;
        },
    },
    providers: [], // providers added in auth.ts
};
