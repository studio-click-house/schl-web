import { User } from 'src/models/user.schema';
export interface PopulatedUser extends Omit<User, 'role'> {
    role: {
        name: string;
        permissions: string[];
    };
}
