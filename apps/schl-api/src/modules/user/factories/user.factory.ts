import { User } from '@repo/common/models/user.schema';
import mongoose from 'mongoose';
import { CreateUserBodyDto } from '../dto/create-user.dto';

export class UserFactory {
    static fromCreateDto(dto: CreateUserBodyDto): Partial<User> {
        return {
            username: dto.username.trim(),
            employee: new mongoose.Types.ObjectId(dto.employee.trim()),
            password: dto.password.trim(), // hashing layer should occur elsewhere (e.g., pre-save hook or service)
            role: new mongoose.Types.ObjectId(dto.role.trim()),
            comment: dto.comment?.trim() || '',
        } as Partial<User>;
    }

    static fromUpdateDto(dto: Partial<CreateUserBodyDto>): Partial<User> {
        const patch: Partial<User> = {};
        if (dto.username !== undefined) patch.username = dto.username.trim();
        if (dto.password !== undefined) patch.password = dto.password; // hashing elsewhere
        if (dto.comment !== undefined) {
            patch.comment = dto.comment?.trim() || '';
        }
        if (dto.role !== undefined)
            patch.role = new mongoose.Types.ObjectId(dto.role);
        if (dto.employee !== undefined)
            patch.employee = new mongoose.Types.ObjectId(dto.employee);
        return patch;
    }
}
