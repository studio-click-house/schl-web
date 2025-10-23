import type { Permissions } from '@repo/schemas/types/permission.type';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL as string;

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
        const res = await fetch(`${BASE_URL}/api/user?action=handle-login`, {
            method: 'GET',
            headers: { username, password },
        });

        if (res.status !== 200) return null;

        const data = await res.json();
        return {
            db_id: data._id,
            db_role_id: data.role_id._id,
            permissions: data.role_id.permissions || [],
            real_name: data.employee_id.real_name,
            e_id: data.employee_id.e_id,
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

// @ts-ignore
export const auth = nextAuth.auth;
// @ts-ignore
export const signIn = nextAuth.signIn;
// @ts-ignore
export const signOut = nextAuth.signOut;
// @ts-ignore
export const { GET, POST } = nextAuth.handlers;
