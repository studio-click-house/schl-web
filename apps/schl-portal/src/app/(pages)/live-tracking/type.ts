export type LiveTrackingTabKey =
    | 'client'
    | 'production'
    | 'qc'
    | 'activity'
    | 'idle'
    | 'user-summary'
    | 'productivity';

export interface LiveTrackingFilters {
    client: string;
    user: string;
    shift: string;
    date: string;
}

export interface PauseReasonItem {
    reason: string;
    durationMinutes: number;
    startedAt: string;
    completedAt: string | null;
}

export interface LiveTrackingFileItem {
    id: string;
    fileName: string;
    status: 'working' | 'done' | 'walkout' | 'paused' | 'idle';
    timeSpentMinutes: number;
    startedAt: string;
    completedAt: string | null;
    report?: string;
}

export interface LiveTrackingSessionItem {
    id: string;
    employeeName: string;
    clientCode: string;
    shift: string;
    workType: string;
    categories: string[];
    totalTimeMinutes: number;
    pauseTimeMinutes: number;
    pauseCount: number;
    estimateTimeMinutes: number;
    folderPath: string;
    createdAt: string;
    updatedAt: string;
    files: LiveTrackingFileItem[];
    pauseReasons: PauseReasonItem[];
}

export interface TrackerUserSessionItem {
    username: string;
    firstLoginAt: string;
    lastLogoutAt: string | null;
    isActive: boolean;
    totalDurationMinutes: number;
}

export interface ClientNofItem {
    clientCode: string;
    nof: number;
}

export interface LiveTrackingMockData {
    sessions: LiveTrackingSessionItem[];
    userSessions: TrackerUserSessionItem[];
    clientNof: ClientNofItem[];
}

