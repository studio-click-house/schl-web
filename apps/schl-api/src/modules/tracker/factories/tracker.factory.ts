import { SyncQcWorkLogDto } from '../dto/sync-qc-work-log.dto';

export class TrackerFactory {
    private static derivePauseReasons(
        pauseReasons?: { reason: string; duration: number }[],
    ) {
        if (Array.isArray(pauseReasons) && pauseReasons.length) {
            return pauseReasons
                .filter(p => p && typeof p.reason === 'string')
                .map(p => ({
                    reason: p.reason.trim(),
                    duration: Number(p.duration) || 0,
                }))
                .filter(p => p.reason);
        }
        return [];
    }

    static qcFilterFromSyncDto(dto: SyncQcWorkLogDto, dateString: string) {
        return {
            employee_name: dto.employeeName.toLowerCase(),
            client_code: (dto.clientCode || 'unknown_client').toLowerCase(),
            folder_path: (dto.folderPath || 'unknown_folder').trim(),
            shift: (dto.shift || 'unknown_shift').toLowerCase(),
            work_type: (dto.workType || 'qc').toLowerCase(),
            date_today: dateString,
        };
    }

    static qcBucketSetFromSyncDto(dto: SyncQcWorkLogDto) {
        const set: Record<string, any> = {};

        if (dto.estimateTime !== undefined) set.estimate_time = dto.estimateTime;
        if (dto.categories !== undefined) set.categories = dto.categories?.trim() || '';

        if (dto.pauseReasons !== undefined)
            set.pause_reasons = this.derivePauseReasons(dto.pauseReasons);

        return set;
    }

    static qcBucketMaxFromSyncDto(dto: SyncQcWorkLogDto) {
        const max: Record<string, number> = {};
        if (dto.pauseCount !== undefined) max.pause_count = Number(dto.pauseCount) || 0;
        if (dto.pauseTime !== undefined) max.pause_time = Number(dto.pauseTime) || 0;
        return max;
    }

    static qcBucketIncFromSyncDto(dto: SyncQcWorkLogDto) {
        const inc: Record<string, number> = {};
        if (dto.totalTimes !== undefined) inc.total_times = Number(dto.totalTimes) || 0;
        return inc;
    }

    static qcFileSetFromSyncFileDto(fileDto: { timeSpent?: number }) {
        const $set: Record<string, any> = {};
        return $set;
    }

    static qcFileIncFromSyncFileDto(fileDto: { timeSpent?: number }) {
        const $inc: Record<string, number> = {};
        if (fileDto.timeSpent !== undefined)
            $inc['files.$.time_spent'] = Number(fileDto.timeSpent) || 0;
        return $inc;
    }

    static qcFileDocFromSyncFileDto(
        fileName: string,
        fileDto: {
            timeSpent?: number;
        },
    ) {
        const fileDoc: Record<string, any> = {
            file_name: fileName,
        };
        if (fileDto.timeSpent !== undefined)
            fileDoc.time_spent = fileDto.timeSpent;
        return fileDoc;
    }
}
