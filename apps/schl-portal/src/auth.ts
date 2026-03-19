import { fetchApiWithServerAuth } from '@/lib/api-server';
import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import type { Permissions } from '@repo/common/types/permission.type';
import { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { fetchApi } from '@repo/common/utils/general-utils';
import jwt from 'jsonwebtoken';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig, SESSION_MAX_AGE_SECONDS } from './auth.config';

export interface UserSessionType {
    db_id: string;
    db_role_id: string;
    permissions: Permissions[];
    real_name: string;
    e_id: string;
    department: EmployeeDepartment;
}

// Align access token lifetime with the session cookie so users stay signed in.
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

async function getUser(
    username: string,
    password: string,
): Promise<UserSessionType | null> {
    try {
        const res = await fetchApiWithServerAuth(
            {
                path: '/v1/user/login',
                query: {
                    clientType: 'portal',
                },
            },
            {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );

        console.log('login request', { username, password });

        console.log('login response status', res);

        if (!res.ok) return null;

        const data = (await res.data) as FullyPopulatedUser;
        console.log('login response data', data);
        return {
            db_id: data._id.toString(),
            db_role_id: data.role._id,
            permissions: data.role.permissions || [],
            real_name: data.employee.real_name,
            e_id: data.employee.e_id,
            department: data.employee.department,
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

const nextAuth = NextAuth({
    ...authConfig,
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const user = await getUser(
                    credentials?.username as string,
                    credentials?.password as string,
                );
                return user ?? null;
            },
        }),
    ],
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
                    // Fetch fresh permissions from the backend to support session revocation and permission updates
                    const res = await fetchApi<FullyPopulatedUser>(
                        {
                            path: `/v1/user/get-user/${token.db_id}`,
                            query: { expanded: 'true' },
                        },
                        {},
                        token.accessToken as string,
                    );

                    if (res.ok && res.data) {
                        const userData = res.data;
                        token.db_id = userData._id.toString();
                        token.db_role_id = userData.role._id;
                        token.real_name = userData.employee.real_name;
                        token.permissions = userData.role.permissions || [];
                        token.e_id = userData.employee.e_id;
                        token.department = userData.employee.department;

                        token.accessToken = signAccessToken({
                            real_name: token.real_name as string,
                            db_id: token.db_id as string,
                            db_role_id: token.db_role_id as string,
                            permissions:
                                (token.permissions as Permissions[]) || [],
                            e_id: token.e_id as string,
                            department: token.department as any,
                        });
                        token.accessTokenExpires =
                            Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
                    } else {
                        // If user is not found or deactivated, return error to log them out
                        token.error = 'RefreshAccessTokenError';
                    }
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
});

export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const { GET, POST } = nextAuth.handlers;
