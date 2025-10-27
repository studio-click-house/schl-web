import type { Permissions } from '@repo/schemas/types/permission.type';
import { FullyPopulatedUser } from '@repo/schemas/types/populated-user.type';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { fetchApi } from './lib/utils';

export interface UserSessionType {
    db_id: string;
    db_role_id: string;
    permissions: Permissions[];
    real_name: string;
    e_id: string;
}

async function getUser(
    username: string,
    password: string,
): Promise<UserSessionType | null> {
    try {
        const res = await fetchApi(
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
});

export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const { GET, POST } = nextAuth.handlers;
