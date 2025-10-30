import { Schedule } from '@repo/common/models/schedule.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateScheduleBodyDto } from '../dto/create-schedule.dto';

export class ScheduleFactory {
    static fromCreateDto(
        dto: CreateScheduleBodyDto,
        session: UserSession,
    ): Partial<Schedule> {
        return {
            receive_date: dto.receive_date.trim(),
            delivery_date: dto.delivery_date.trim(),
            client_code: dto.client_code.trim(),
            client_name: dto.client_name.trim(),
            task: dto.task.trim(),
            comment: dto.comment?.trim() || '',
            updated_by: session.db_id,
        } as Partial<Schedule>;
    }

    static fromUpdateDto(
        dto: Partial<CreateScheduleBodyDto>,
        session: UserSession,
    ): Partial<Schedule> {
        const patch: Partial<Schedule> = {};
        if (dto.receive_date !== undefined)
            patch.receive_date = dto.receive_date.trim();
        if (dto.delivery_date !== undefined)
            patch.delivery_date = dto.delivery_date.trim();
        if (dto.client_code !== undefined)
            patch.client_code = dto.client_code.trim();
        if (dto.client_name !== undefined)
            patch.client_name = dto.client_name.trim();
        if (dto.task !== undefined) patch.task = dto.task.trim();
        if (dto.comment !== undefined)
            patch.comment = dto.comment?.trim() || '';
        if (Object.keys(patch).length > 0) {
            patch.updated_by = session.db_id;
        }
        return patch;
    }
}
