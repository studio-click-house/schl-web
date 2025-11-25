import type {
    QnapDir,
    QnapSortField,
} from '@repo/common/constants/qnap.constant';

export interface QnapConfig {
    host: string;
    port?: number;
    username: string;
    password: string;
    https?: boolean;
}

// v5 Auth returns XML, parsed structure looks like this
export interface LoginResponseXml {
    QDocRoot: {
        authPassed: number; // 1 = success, 0 = fail
        authSid: string; // The Session ID
        username: string;
        isAdmin: number;
        errorValue?: number;
        [key: string]: any;
    };
}

export interface ApiResponse {
    status: number; // 1 = success
    success?: string; // "true"
    version?: string; // e.g., "5.0.0"
    build?: string;
    [key: string]: any;
}

export interface ListOptions {
    path: string;
    start?: number;
    limit?: number;
    sort?: QnapSortField;
    dir?: QnapDir;
    hidden_file?: 0 | 1;
}

export interface DeleteOptions {
    /** * Force delete function.
     * true: permanently delete (not active Recycle bin).
     * false: move to recycle bin (if enabled).
     */
    force?: boolean;
}

export class QnapApiError extends Error {
    constructor(
        public context: string,
        public status: number,
        message?: string,
    ) {
        super(message || `QNAP API error in ${context}: status ${status}`);
        this.name = 'QnapApiError';
    }
}
