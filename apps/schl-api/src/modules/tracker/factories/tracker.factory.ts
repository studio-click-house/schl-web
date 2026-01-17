import { SyncWorkLogDto } from '../dto/sync-work-log.dto';

export class TrackerFactory {
    static fromSyncDto(dto: SyncWorkLogDto) {
        return {
            folder_path: dto.folderPath?.trim(),
            file_name: dto.fileName.trim(),
            file_status: dto.fileStatus.trim(),
            time_spent: dto.timeSpent || 0,
            pause_count: dto.pauseCount || 0,
            pause_time: dto.pauseTime || 0,
            categories: dto.categories?.trim() || '',
            started_at: dto.startedAt ? new Date(dto.startedAt) : new Date(),
            completed_at: dto.completedAt ? new Date(dto.completedAt) : null,
        };
    }

    static fromSyncUpdateDto(dto: SyncWorkLogDto) {
        const patch: Record<string, unknown> = {};

        if (dto.fileStatus) patch.file_status = dto.fileStatus;
        if (dto.folderPath) patch.folder_path = dto.folderPath;
        if (dto.timeSpent !== undefined) patch.time_spent = dto.timeSpent;
        if (dto.pauseCount !== undefined) patch.pause_count = dto.pauseCount;
        if (dto.pauseTime !== undefined) patch.pause_time = dto.pauseTime;
        if (dto.categories) patch.categories = dto.categories;
        if (dto.completedAt) patch.completed_at = new Date(dto.completedAt);
        if (dto.startedAt) patch.started_at = new Date(dto.startedAt);

        return patch;
    }
}
