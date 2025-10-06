import { Role } from 'src/models/role.schema';
import { CreateRoleBodyDto } from '../dto/create-role.dto';

export class RoleFactory {
    static fromCreateDto(dto: CreateRoleBodyDto): Partial<Role> {
        return {
            name: dto.name.trim(),
            description: dto.description?.trim() || '',
            permissions: [...dto.permissions],
        };
    }

    static fromUpdateDto(dto: Partial<CreateRoleBodyDto>): Partial<Role> {
        const patch: Partial<Role> = {};
        if (dto.name !== undefined) patch.name = dto.name.trim();
        if (dto.description !== undefined)
            patch.description = dto.description?.trim() || '';
        if (dto.permissions !== undefined)
            patch.permissions = [...dto.permissions];
        return patch;
    }
}
