import { CreateDailyUpdateBodyDto } from '../dto/create-daily-update.dto';

export class DailyUpdateFactory {
    static fromUpdateDto(dto: Partial<CreateDailyUpdateBodyDto>) {
        const patch: Partial<CreateDailyUpdateBodyDto> = {};
        if (dto.message !== undefined) {
            patch.message = dto.message.trim();
        }
        return patch;
    }
}
