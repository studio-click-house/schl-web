import type { Permissions } from './permission.type';
export interface UserSession {
    real_name: string;
    db_id: string;
    permissions: Permissions[];
    role_id: string;
}
