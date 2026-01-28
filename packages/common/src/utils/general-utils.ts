import {
    EXEMPT_DEPARTMENTS,
    type ExemptDepartment,
} from '@repo/common/constants/notice.constant';
import { ClassValue, clsx } from 'clsx';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import { twMerge } from 'tailwind-merge';

export const isExemptDepartment = (department?: string | null): boolean =>
    Boolean(department) &&
    EXEMPT_DEPARTMENTS.includes(department as ExemptDepartment);

type CamelcaseKeysFn = (typeof import('camelcase-keys'))['default'];

let cachedCamelcaseKeys: CamelcaseKeysFn | null = null;

const loadCamelcaseKeys = async (): Promise<CamelcaseKeysFn> => {
    if (!cachedCamelcaseKeys) {
        const module = await import('camelcase-keys');
        cachedCamelcaseKeys = module.default;
    }
    return cachedCamelcaseKeys;
};

export const cn = (...input: ClassValue[]) => twMerge(clsx(input));

type Primitive = string | number | boolean | null | undefined;

export type FetchApiTarget =
    | string
    | URL
    | {
          path: string;
          query?: Record<string, Primitive | Primitive[]>;
          baseUrl?: string;
      };

const buildUrl = (target: FetchApiTarget): URL => {
    const fallbackBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const ensureBase = (base?: string): string => {
        const resolved = base ?? fallbackBase;
        if (!resolved) {
            throw new Error('API base URL is not configured');
        }
        return resolved.endsWith('/') ? resolved : `${resolved}/`;
    };

    if (target instanceof URL) {
        return target;
    }

    if (typeof target === 'string') {
        if (/^https?:\/\//i.test(target)) {
            return new URL(target);
        }

        const base = ensureBase();
        return new URL(target, base);
    }

    const base = ensureBase(target.baseUrl);
    const path = target.path;
    const url = new URL(path, base);

    if (target.query) {
        Object.entries(target.query).forEach(([key, value]) => {
            if (value === undefined || value === null) return;

            if (Array.isArray(value)) {
                value.forEach(item => {
                    if (item !== undefined && item !== null) {
                        url.searchParams.append(key, String(item));
                    }
                });
                return;
            }

            url.searchParams.set(key, String(value));
        });
    }

    return url;
};

export const splitEmailList = (value: string): string[] =>
    value
        .split('/')
        .map(part => part.trim())
        .filter(part => part.length > 0);

export const normalizeEmailListInput = (raw: unknown): string | undefined => {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'string') return undefined;

    const parts = splitEmailList(raw);
    if (!parts.length) return undefined;

    return parts.join(' / ');
};

export const normalizeEmailListForStorage = (value?: string | null): string => {
    if (!value) return '';
    const parts = splitEmailList(value);
    if (!parts.length) return '';
    return parts.map(part => part.toLowerCase()).join(' / ');
};

export interface NestJsError {
    statusCode: number;
    message: string | string[];
    error: string;
}

type FetchSuccess<TData> = {
    data: TData;
    ok: true;
    status: number;
    headers: Headers;
};

type FetchError = {
    data: NestJsError;
    ok: false;
    status: number;
    headers: Headers;
};

export type FetchApiResponse<TData> = FetchSuccess<TData> | FetchError;

const stripUpdatedByField = (input: unknown): unknown => {
    if (Array.isArray(input)) {
        return input.map(item => stripUpdatedByField(item));
    }
    if (input && typeof input === 'object') {
        const record = input as Record<string, unknown>;
        delete record.updated_by;
        delete record.updatedBy;
        Object.keys(record).forEach(key => {
            record[key] = stripUpdatedByField(record[key]);
        });
        return record;
    }
    return input;
};

export const fetchApi = async <TData = unknown>(
    target: FetchApiTarget,
    options: RequestInit = {},
    authToken?: string,
): Promise<FetchApiResponse<TData>> => {
    try {
        const url = buildUrl(target);

        const newOptions = { ...options };

        if (newOptions.body && typeof newOptions.body === 'string') {
            try {
                const parsedBody = JSON.parse(newOptions.body);
                const strippedBody = stripUpdatedByField(parsedBody);
                const camelcaseKeysTransform = await loadCamelcaseKeys();
                const camelCasedBody = camelcaseKeysTransform(strippedBody, {
                    deep: false,
                });
                const sanitizedBody = stripUpdatedByField(camelCasedBody);
                newOptions.body = JSON.stringify(sanitizedBody);
            } catch {
                // Not a JSON body, leave it as is
            }
        }

        const mergedHeaders = new Headers(newOptions.headers);

        if (typeof window !== 'undefined') {
            // Client-side: Use browser's location
            if (!mergedHeaders.has('origin')) {
                mergedHeaders.set('origin', window.location.origin);
            }
            if (!mergedHeaders.has('host')) {
                mergedHeaders.set('host', window.location.host);
            }
        } else {
            // Server-side: Use environment variables to determine origin
            const appName = process.env.NEXT_PUBLIC_APP_NAME; // 'portal' or 'crm'
            const consumerUrl = process.env.NEXT_PUBLIC_BASE_URL;

            let origin: string | undefined;
            if (appName === 'portal' && consumerUrl) {
                origin = consumerUrl;
            } else if (appName === 'crm' && consumerUrl) {
                origin = consumerUrl;
            }

            if (origin) {
                const originUrl = new URL(origin);
                if (!mergedHeaders.has('origin')) {
                    mergedHeaders.set('origin', originUrl.origin);
                }
                if (!mergedHeaders.has('host')) {
                    mergedHeaders.set('host', originUrl.host);
                }
            }
        }

        if (authToken && !mergedHeaders.has('Authorization')) {
            mergedHeaders.set('Authorization', `Bearer ${authToken}`);
        }

        const response = await fetch(url, {
            ...newOptions,
            headers: mergedHeaders,
        });

        let data: unknown = null;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            data = await response.json().catch(() => null);
        } else if (
            contentType?.includes('application/octet-stream') ||
            contentType?.includes('application/zip') ||
            contentType?.includes('application/pdf') ||
            contentType?.includes('image/') ||
            contentType?.includes('video/') ||
            contentType?.includes('audio/')
        ) {
            // Handle binary data as blob
            data = await response.blob();
        } else {
            const text = await response.text();
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = text;
            }
        }

        if (response.ok) {
            return {
                data: data as TData,
                ok: true,
                status: response.status,
                headers: response.headers,
            };
        }
        return {
            data: data as NestJsError,
            ok: false,
            status: response.status,
            headers: response.headers,
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

export const copy = async (text: string) => {
    // confirm user if he wants to open the folder or not via confirm alert
    const confirmOpen = confirm('Do you want to copy this text to clipboard?');
    if (!confirmOpen) return;

    navigator.clipboard.writeText(text);
};

export function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// generatePassword: produce a readable "Word#123" style password with sensible fallbacks
export function generatePassword(
    inputString: string,
    specifiedDigits?: number | string,
): string {
    const fallbackWords = [
        'Aurora',
        'Falcon',
        'Ember',
        'Harbor',
        'Lagoon',
        'Meadow',
        'Nebula',
        'Onyx',
        'Prairie',
        'Quartz',
        'Ranger',
        'Saffron',
        'Tundra',
        'Vertex',
        'Willow',
        'Zephyr',
    ];
    const symbolSet = '!@#$%&*-_=+';
    const digitSet = '0123456789';

    const toTitleCase = (value: string): string => {
        if (!value) return '';
        const lower = value.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    };

    const extractBaseWord = (value: string): string => {
        const trimmed = (value || '').trim();
        if (!trimmed) return '';
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (!parts.length) return '';
        const lastPart = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '');
        return toTitleCase(lastPart);
    };

    const baseWord =
        extractBaseWord(inputString) ||
        fallbackWords[getRandomInt(fallbackWords.length) || 0];

    const symbol = pickRandom(symbolSet) || '@';

    const digitsPool = (specifiedDigits ?? '')
        .toString()
        .replace(/\D/g, '')
        .split('');

    const digitsBuilder: string[] = [];
    const availableDigits = [...digitsPool];

    while (digitsBuilder.length < 3) {
        if (availableDigits.length) {
            const index = getRandomInt(availableDigits.length);
            digitsBuilder.push(availableDigits.splice(index, 1)[0]);
        } else {
            digitsBuilder.push(pickRandom(digitSet) || '0');
        }
    }

    const digits = digitsBuilder.join('');

    return `${baseWord}${symbol}${digits}`;
}

function getRandomInt(max: number): number {
    if (max <= 0) return 0;
    if (
        typeof globalThis.crypto !== 'undefined' &&
        typeof globalThis.crypto.getRandomValues === 'function'
    ) {
        const array = new Uint32Array(1);
        globalThis.crypto.getRandomValues(array);
        return array[0] % max;
    }

    return Math.floor(Math.random() * max);
}

function pickRandom(source: string): string {
    if (!source) return '';
    return source.charAt(getRandomInt(source.length));
}

export const isEmployeePermanent = (
    joiningDate: string,
): {
    isPermanent: boolean;
    remainingTime?: number; // in days
    serviceTime?: number; // in days
} => {
    const joinDate = moment(joiningDate, 'YYYY-MM-DD');
    const probationEndDate = joinDate.clone().add(6, 'months');
    const today = moment();

    const isPermanent = today.isSameOrAfter(probationEndDate);

    // Calculate remaining time if not permanent
    if (!isPermanent) {
        const remainingDays = probationEndDate.diff(today, 'days');
        return {
            isPermanent: false,
            remainingTime: remainingDays, // Return raw days
        };
    }

    // Calculate job age/service time if permanent
    const serviceTime = today.diff(joinDate, 'days');
    return {
        isPermanent: true,
        serviceTime: serviceTime, // Return raw days
    };
};

export async function sha256(message: string): Promise<string> {
    // Encode the message as UTF-8
    const msgBuffer = new TextEncoder().encode(message);

    // Hash the message using SHA-256 algorithm
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // Convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert bytes to a hexadecimal string
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

export const generateAvatar = async (text: string): Promise<string> => {
    const value = await sha256(
        text?.trim().toLowerCase() || 'johndoe@schl.com',
    ); // Default to 'johndoe@schl.com' if value (expected to be a email or username) is missing.

    const avatar = `https://gravatar.com/avatar/${value}/?s=400&d=identicon&r=x`; // Set image size, default avatar, and rating restrictions.

    return avatar;
};

export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const verifyCookie = (token?: string, id?: string) => {
    try {
        if (!token) {
            return false;
        }

        const decoded = jwt.verify(
            token,
            process.env.AUTH_SECRET as string,
        ) as {
            userId: string;
            exp: number;
        };

        const userIdFromToken = decoded.userId;
        const sessionUserId = id;
        console.log(userIdFromToken, sessionUserId);

        if (
            userIdFromToken !== sessionUserId ||
            Date.now() >= decoded.exp * 1000
        ) {
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error verifying token:', error);
        return false;
    }
};

export function getInlinePages(current: number, total: number): number[] {
    if (total <= 3) {
        // If there are 3 or fewer pages, show them all.
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 2) {
        return [1, 2, 3];
    }
    if (current >= total - 1) {
        return [total - 2, total - 1, total];
    }
    return [current - 1, current, current + 1];
}

export const incrementInvoiceNumber = (invoiceNumber: string): string => {
    // Match the prefix (non-numeric) and numeric parts
    const match = invoiceNumber.match(/^([A-Za-z]*)(\d+)$/);

    if (!match) {
        throw new Error('Invalid invoice number format');
    }

    const prefix = match[1]; // Extract the non-numeric prefix (e.g., 'XO')
    const numericPart = match[2]!; // Extract the numeric part (e.g., '0028')

    // Increment the numeric part
    const incrementedNumber = (parseInt(numericPart, 10) + 1).toString();

    // Pad the numeric part with leading zeros to match the original length
    const paddedNumber = incrementedNumber.padStart(numericPart.length, '0');

    // Return the new invoice number
    return `${prefix}${paddedNumber}`;
};

export const constructFileName = (
    file_name: string,
    notice_no: string,
): string => {
    const file_ext = file_name.split('.').pop();
    const file_name_without_ext = file_name.split('.').slice(0, -1).join('.');
    const new_file_name = `${file_name_without_ext}_${notice_no}.${file_ext}`;
    return new_file_name;
};

/**
 * Remove duplicate items from an iterable preserving the first-seen order.
 * Default behavior is case-sensitive (identity) -- i.e. strings are treated
 * as-is unless a `keySelector` is supplied to normalize (eg. toLowerCase).
 */
export function removeDuplicates<T, K = T>(
    items: Iterable<T> | null | undefined,
    keySelector?: (item: T) => K,
): T[] {
    if (!items) {
        return [];
    }

    const seen = new Set<K>();
    const output: T[] = [];

    for (const item of items) {
        const key = keySelector ? keySelector(item) : (item as unknown as K);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        output.push(item);
    }

    return output;
}

export const isValidMails = (mail: string): boolean => {
    const emailPattern =
        /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;\s@"]+\.{0,1})+([^<>()[\].,;\s@"]{2,}|[\d.]+))$/;

    // Split the input string by ' / ' and trim any extra spaces
    const emails: string[] = mail.split(' / ').map(email => email.trim());

    // Check if every email in the array matches the pattern
    return emails.every(email => emailPattern.test(email));
};

export const isValidHttpUrls = (string: string): boolean => {
    // Split the string by space (multiple links are separated by space in the input string)
    const urls = string.split(' ');

    for (const urlString of urls) {
        let url: URL;
        try {
            url = new URL(urlString);
        } catch {
            return false;
        }
        if (!(url.protocol === 'http:' || url.protocol === 'https:')) {
            return false;
        }
    }
    return true;
};

export const countPassedDaysSinceADate = (date: Date): number => {
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - date.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
    return daysDifference;
};

export const calculateTimeDifference = (
    deliveryDate?: string,
    deliveryBdTime?: string,
): number => {
    if (!deliveryDate) return Number.MAX_SAFE_INTEGER;
    const time = (deliveryBdTime || '23:59').trim() || '23:59';
    const due = moment.tz(
        `${deliveryDate} ${time}`,
        'YYYY-MM-DD HH:mm',
        'Asia/Dhaka',
    );

    const now = moment.tz('Asia/Dhaka');
    return due.diff(now, 'minutes');
};

/**
 * Normalize folder path and generate a stable key.
 * - backslashes to forward slashes
 * - strip drive letters like C:\ or C:/
 * - collapse duplicate slashes, trim leading/trailing slashes
 */
export const normalizeFolderPath = (rawPath?: string | null) => {
    const input = String(rawPath || '').trim();
    if (!input) return { displayPath: '', folderKey: '' };
    // convert backslashes to forward slashes
    let s = input.replace(/\\+/g, '/');
    // remove drive prefix like 'C:/'
    s = s.replace(/^[A-Za-z]:\//, '');
    // collapse duplicate slashes
    s = s.replace(/\/+/g, '/');
    // trim leading and trailing slashes
    s = s.replace(/^\/+/, '').replace(/\/+$/, '');
    const displayPath = s;
    const folderKey = displayPath.toLowerCase();
    return { displayPath, folderKey };
};
