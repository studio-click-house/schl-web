import { Shift } from '@repo/common/models/shift.schema';
import { CreateShiftDto, UpdateShiftDto } from '../dto/shift.dto';

export class ShiftFactory {
    static fromCreateDto(dto: CreateShiftDto): Partial<Shift> {
        return {
            type: dto.type,
            name: dto.name.trim(),
            start_time: dto.startTime.trim(),
            end_time: dto.endTime.trim(),
            grace_minutes: dto.graceMinutes ?? 15,
            crosses_midnight: dto.crossesMidnight ?? false,
            is_active: dto.isActive ?? true,
        } as Partial<Shift>;
    }

    static fromUpdateDto(dto: UpdateShiftDto): Partial<Shift> {
        const patch: Partial<Shift> = {};

        if (dto.name !== undefined) patch.name = dto.name.trim();
        if (dto.startTime !== undefined)
            patch.start_time = dto.startTime.trim();
        if (dto.endTime !== undefined) patch.end_time = dto.endTime.trim();
        if (dto.graceMinutes !== undefined)
            patch.grace_minutes = dto.graceMinutes;
        if (dto.crossesMidnight !== undefined)
            patch.crosses_midnight = dto.crossesMidnight;
        if (dto.isActive !== undefined) patch.is_active = dto.isActive;

        return patch;
    }
}
