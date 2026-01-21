import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import type { Permissions } from '@repo/common/types/permission.type';
import { DefaultSession } from 'next-auth';
import { UserSessionType } from './auth';

// Extend the default User type
declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: UserSessionType;
        accessToken?: string;
        accessTokenExpires?: number; // epoch ms
        error?: string;
    }

    interface User {
        db_id: string;
        db_role_id: string;
        permissions: Permissions[];
        real_name: string;
        e_id: string;
        department: EmployeeDepartment;
    }
}

// Extend the JWT type
declare module 'next-auth/jwt' {
    interface JWT {
        db_id: string;
        db_role_id: string;
        permissions: Permissions[];
        real_name: string;
        e_id: string;
        department: EmployeeDepartment;
        accessToken?: string;
        accessTokenExpires?: number; // epoch ms
        error?: string;
    }
}
