import type { EmployeeDepartment } from '../constants/employee.constant';
import type { Permissions } from './permission.type';
export interface UserSession {
    real_name: string; // employee's real full name
    db_id: string; // user's _id in database
    permissions: Permissions[]; // user's permissions
    role_id: string; // user's role _id in database
    e_id: string; // employee's e_id
    department: EmployeeDepartment; // employee's department
}
