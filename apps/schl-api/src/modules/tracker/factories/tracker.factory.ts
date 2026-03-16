import { SyncQcWorkLogDto } from '../dto/sync-qc-work-log.dto';

export class TrackerFactory {
    static normalizeEmployeeName(value: unknown): string {
        const text =
            value === null || value === undefined
                ? ''
                : typeof value === 'string'
                  ? value
                  : typeof value === 'number' || typeof value === 'boolean'
                    ? String(value)
                    : '';
        const raw = text.trim().replace(/\s+/g, ' ');
        if (!raw) return '';

        const titleCaseWord = (word: string): string => {
            const trimmed = word.trim();
            if (!trimmed) return '';
            return (
                trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
            );
        };

        const titleCaseText = (input: string): string => {
            return input
                .trim()
                .split(' ')
                .filter(Boolean)
                .map(w =>
                    w
                        .split('-')
                        .map(part => titleCaseWord(part))
                        .join('-'),
                )
                .join(' ');
        };

        // Example format: "username - real name"
        // We want: "M0102 - Md Mostak Ahmed Nayem"
        const dashIndex = raw.indexOf('-');
        if (dashIndex !== -1) {
            const username = raw.slice(0, dashIndex).trim();
            const realName = raw.slice(dashIndex + 1).trim();

            const formattedUsername = username
                ? username.charAt(0).toUpperCase() + username.slice(1)
                : '';
            const formattedRealName = titleCaseText(realName);

            if (formattedUsername && formattedRealName) {
                return `${formattedUsername} - ${formattedRealName}`;
            }
            return formattedUsername || formattedRealName;
        }

        // Fallback for names without hyphen
        return titleCaseText(raw);
    }

    static qcFilterFromSyncDto(dto: SyncQcWorkLogDto, dateString: string) {
        return {
            employee_name: TrackerFactory.normalizeEmployeeName(
                dto.employeeName,
            ),
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
