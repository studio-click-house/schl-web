import { SyncQcWorkLogDto } from '../dto/sync-qc-work-log.dto';

export class TrackerFactory {
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

        if (dto.estimateTime !== undefined)
            set.estimate_time = dto.estimateTime;
        if (dto.categories !== undefined)
            set.categories = dto.categories?.trim() || '';

        return set;
    }

    static qcBucketMaxFromSyncDto() {
        const max: Record<string, number> = {};
        return max;
    }

    static qcBucketIncFromSyncDto(dto: SyncQcWorkLogDto) {
        const inc: Record<string, number> = {};
        if (dto.totalTimes !== undefined)
            inc.total_times = Number(dto.totalTimes) || 0;
        return inc;
    }

    static qcFileSetFromSyncFileDto(fileDto: { timeSpent?: number }) {
        void fileDto;
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
            filePath?: string;
        },
    ) {
        const fileDoc: Record<string, any> = {
            file_name: fileName,
        };
        const fp = (fileDto.filePath ?? '').trim();
        if (fp) fileDoc.file_path = fp;
        if (fileDto.timeSpent !== undefined)
            fileDoc.time_spent = fileDto.timeSpent;
        return fileDoc;
    }
}
