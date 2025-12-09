import type { Permissions } from './permission.type';
export interface UserSession {
    real_name: string; // employee's real full name
    db_id: string; // user's _id in database
    permissions: Permissions[]; // user's permissions
    role_id: string; // user's role _id in database
}
