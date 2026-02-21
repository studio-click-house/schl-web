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
        if (dto.totalTimes !== undefined) set.total_times = dto.totalTimes;

        if (dto.pauseCount !== undefined) set.pause_count = dto.pauseCount;
        if (dto.pauseTime !== undefined) set.pause_time = dto.pauseTime;
        if (dto.pauseReasons !== undefined)
            set.pause_reasons = this.derivePauseReasons(dto.pauseReasons);

        return set;
    }

    static qcFileSetFromSyncFileDto(fileDto: {
        timeSpent?: number;
    }) {
        const $set: Record<string, any> = {};
        if (fileDto.timeSpent !== undefined)
            $set['files.$.time_spent'] = fileDto.timeSpent;
        return $set;
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
