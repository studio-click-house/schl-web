import { SyncWorkLogDto } from '../dto/sync-work-log.dto';

export class TrackerFactory {
    static fromSyncDto(dto: SyncWorkLogDto) {
        return {
            folderPath: dto.folderPath?.trim(),
            fileName: dto.fileName.trim(),
            fileStatus: dto.fileStatus.trim(),
            timeSpent: dto.timeSpent || 0,
            pauseCount: dto.pauseCount || 0,
            pauseTime: dto.pauseTime || 0,
            categories: dto.categories?.trim() || '',
            startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
            completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        };
    }

    static fromSyncUpdateDto(dto: SyncWorkLogDto) {
        const patch: Record<string, unknown> = {};

        if (dto.fileStatus) patch.fileStatus = dto.fileStatus;
        if (dto.folderPath) patch.folderPath = dto.folderPath;
        if (dto.timeSpent !== undefined) patch.timeSpent = dto.timeSpent;
        if (dto.pauseCount !== undefined) patch.pauseCount = dto.pauseCount;
        if (dto.pauseTime !== undefined) patch.pauseTime = dto.pauseTime;
        if (dto.categories) patch.categories = dto.categories;
        if (dto.completedAt) patch.completedAt = new Date(dto.completedAt);
        if (dto.startedAt) patch.startedAt = new Date(dto.startedAt);

        return patch;
    }
}
