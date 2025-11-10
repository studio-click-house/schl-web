import { Schedule } from '@repo/common/models/schedule.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateScheduleBodyDto } from '../dto/create-schedule.dto';

export class ScheduleFactory {
    static fromCreateDto(
        dto: CreateScheduleBodyDto,
        session: UserSession,
    ): Partial<Schedule> {
        return {
            receive_date: dto.receiveDate.trim(),
            delivery_date: dto.deliveryDate.trim(),
            client_code: dto.clientCode.trim(),
            client_name: dto.clientName.trim(),
            task: dto.task.trim(),
            comment: dto.comment?.trim() || '',
            updated_by: session.real_name,
        } as Partial<Schedule>;
    }

    static fromUpdateDto(
        dto: Partial<CreateScheduleBodyDto>,
        session: UserSession,
    ): Partial<Schedule> {
        const patch: Partial<Schedule> = {};
        if (dto.receiveDate !== undefined)
            patch.receive_date = dto.receiveDate.trim();
        if (dto.deliveryDate !== undefined)
            patch.delivery_date = dto.deliveryDate.trim();
        if (dto.clientCode !== undefined)
            patch.client_code = dto.clientCode.trim();
        if (dto.clientName !== undefined)
            patch.client_name = dto.clientName.trim();
        if (dto.task !== undefined) patch.task = dto.task.trim();
        if (dto.comment !== undefined)
            patch.comment = dto.comment?.trim() || '';
        if (Object.keys(patch).length > 0) {
            patch.updated_by = session.real_name;
        }
        return patch;
    }
}
