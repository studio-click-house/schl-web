import type { Permissions } from './permission.type';
export interface UserSession {
    db_id: string;
    permissions: Permissions[];
    role_id: string;
}
