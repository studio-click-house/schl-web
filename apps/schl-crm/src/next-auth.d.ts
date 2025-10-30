import type { Permissions } from '@repo/common/types/permission.type';
import { DefaultSession } from 'next-auth';
import { UserSessionType } from './auth';

// Extend the default User type
declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: UserSessionType;
        accessToken?: string;
        accessTokenExpires?: number; // epoch ms
    }

    interface User {
        db_id: string;
        db_role_id: string;
        permissions: Permissions[];
        real_name: string;
        provided_name: string;
        e_id: string;
    }
}

// Extend the JWT type
declare module 'next-auth/jwt' {
    interface JWT {
        db_id: string;
        db_role_id: string;
        permissions: Permissions[];
        real_name: string;
        provided_name: string;
        e_id: string;
        accessToken?: string;
        accessTokenExpires?: number; // epoch ms
    }
}
