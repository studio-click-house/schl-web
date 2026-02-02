import { DeviceUser } from '@repo/common/models/device-user.schema';
import { CreateDeviceUserBodyDto } from '../dto/create-device-user.dto';

export class DeviceUserFactory {
    static fromCreateDto(dto: CreateDeviceUserBodyDto): Partial<DeviceUser> {
        return {
            user_id: dto.userId.trim(),
            card_number: dto.cardNumber?.trim() || null,
            employee: dto.employeeId as any, // Will be ObjectId in practice
            comment: dto.comment?.trim() || '',
        } as Partial<DeviceUser>;
    }

    static fromUpdateDto(
        dto: Partial<CreateDeviceUserBodyDto>,
    ): Partial<DeviceUser> {
        const patch: Partial<DeviceUser> = {};
        if (dto.userId !== undefined) patch.user_id = dto.userId.trim();
        if (dto.cardNumber !== undefined)
            patch.card_number = dto.cardNumber?.trim() || null;
        if (dto.employeeId !== undefined)
            patch.employee = dto.employeeId as any;
        if (dto.comment !== undefined)
            patch.comment = dto.comment?.trim() || '';
        return patch;
    }
}
