import { type Permissions } from '@repo/schemas/types/permission.type';
import { UserDocument } from '@repo/schemas/user.schema';
export interface PopulatedByEmployeeUser
    extends Omit<UserDocument, 'employee'> {
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
    extends Omit<UserDocument, 'employee' | 'role'>,
        Pick<PopulatedByEmployeeUser, 'employee'>,
        Pick<PopulatedByRoleUser, 'role'> {}
