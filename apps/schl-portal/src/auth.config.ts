import type { Permissions } from '@repo/common/types/permission.type';
import jwt from 'jsonwebtoken';
import type { NextAuthConfig } from 'next-auth';
import { UserSessionType } from './auth';

// Align access token lifetime with the session cookie so users stay signed in.
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ACCESS_TOKEN_TTL_SECONDS = SESSION_MAX_AGE_SECONDS;
const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 15 * 60; // 15 minutes

function signAccessToken(
    payload: Pick<
        UserSessionType,
        | 'real_name'
        | 'db_id'
        | 'db_role_id'
        | 'permissions'
        | 'e_id'
        | 'department'
    >,
) {
    const secret = process.env.AUTH_SECRET;
    if (!secret)
        throw new Error('Missing AUTH_SECRET for signing access token');
    return jwt.sign(
        {
            name: payload.real_name,
            sub: payload.db_id,
            role: payload.db_role_id,
            perms: payload.permissions,
            e_id: payload.e_id,
            dept: payload.department,
        },
        secret,
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
}

export const authConfig: NextAuthConfig = {
    session: {
        strategy: 'jwt', // session stored in secure, HttpOnly JWT cookie
        maxAge: SESSION_MAX_AGE_SECONDS,
    },
    pages: {
        error: '/login',
        signIn: '/login',
    },
    callbacks: {
        // attach user data to JWT cookie
        async jwt({ token, user }) {
            // Initial sign-in: copy user info + create short-lived access token
            if (user) {
                token.db_id = user.db_id;
                token.db_role_id = user.db_role_id;
                token.real_name = user.real_name;
                token.permissions = user.permissions;
                token.e_id = user.e_id;
                token.department = user.department;

                try {
                    token.accessToken = signAccessToken({
                        real_name: user.real_name,
                        db_id: user.db_id as string,
                        db_role_id: user.db_role_id as string,
                        permissions: (user.permissions as Permissions[]) || [],
                        e_id: user.e_id as string,
                        department: user.department as any,
                    });
                    token.accessTokenExpires =
                        Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
                } catch (e) {
                    console.error('Failed to sign access token', e);
                    token.error = 'RefreshAccessTokenError';
                }
                return token;
            }

            // Subsequent calls: rotate if expired (silent refresh on usage)
            if (
                token.accessTokenExpires &&
                Date.now() >
                    (token.accessTokenExpires as number) -
                        ACCESS_TOKEN_REFRESH_BUFFER_SECONDS * 1000
            ) {
                try {
                    token.accessToken = signAccessToken({
                        real_name: token.real_name as string,
                        db_id: token.db_id as string,
                        db_role_id: token.db_role_id as string,
                        permissions: (token.permissions as Permissions[]) || [],
                        e_id: token.e_id as string,
                        department: token.department as any,
                    });
                    token.accessTokenExpires =
                        Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
                } catch (e) {
                    console.error('Failed to refresh access token', e);
                    token.error = 'RefreshAccessTokenError';
                }
            }
            return token;
        },
        // session exposed to frontend via useSession()
        async session({ session, token }: { session: any; token: any }) {
            if (token) {
                session.user = {
                    db_id: token.db_id,
                    db_role_id: token.db_role_id,
                    real_name: token.real_name,
                    permissions: token.permissions,
                    e_id: token.e_id,
                    department: token.department,
                };
                session.accessToken = token.accessToken; // expose short-lived access token
                session.accessTokenExpires = token.accessTokenExpires;
                session.error = token.error;
            }
            return session;
        },
    },
    providers: [], // providers added in src/auth.ts
};
