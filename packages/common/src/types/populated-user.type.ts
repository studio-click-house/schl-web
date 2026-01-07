import { UserDocument } from '../models/user.schema';
import { type Permissions } from './permission.type';
export interface PopulatedByEmployeeUser extends Omit<
    UserDocument,
    'employee'
> {
    employee: {
        _id: string;
        e_id: string;
        real_name: string;
        company_provided_name: string;
    };
}

export interface PopulatedByRoleUser extends Omit<UserDocument, 'role'> {
    role: {
        _id: string;
        name: string;
        permissions: Permissions[];
    };
}

export interface FullyPopulatedUser
    extends
        Omit<UserDocument, 'employee' | 'role'>,
        Pick<PopulatedByEmployeeUser, 'employee'>,
        Pick<PopulatedByRoleUser, 'role'> {}
