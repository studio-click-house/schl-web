import mongoose from 'mongoose';
import { User } from 'src/models/user.schema';
import { CreateUserBodyDto } from '../dto/create-user.dto';

export class UserFactory {
    static fromCreateDto(dto: CreateUserBodyDto): Partial<User> {
        return {
            name: dto.name.trim(),
            real_name: dto.real_name.trim(),
            provided_name: dto.provided_name?.trim() || null,
            password: dto.password, // hashing layer should occur elsewhere (e.g., pre-save hook or service)
            role: new mongoose.Types.ObjectId(dto.role),
            comment: dto.comment?.trim() || '',
        } as Partial<User>;
    }

    static fromUpdateDto(dto: Partial<CreateUserBodyDto>): Partial<User> {
        const patch: Partial<User> = {};
        if (dto.name !== undefined) patch.name = dto.name.trim();
        if (dto.real_name !== undefined) patch.real_name = dto.real_name.trim();
        if (dto.provided_name !== undefined)
            patch.provided_name = dto.provided_name?.trim() || null;
        if (dto.password !== undefined) patch.password = dto.password; // hashing elsewhere
        if (dto.comment !== undefined) {
            patch.comment = dto.comment?.trim() || '';
        }
        if (dto.role !== undefined)
            patch.role = new mongoose.Types.ObjectId(dto.role);
        return patch;
    }
}
