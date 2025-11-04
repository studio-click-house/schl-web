import { ClassValue, clsx } from 'clsx';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import { twMerge } from 'tailwind-merge';

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

export const fetchApi = async <TData = unknown>(
    target: FetchApiTarget,
    options: RequestInit = {},
    authToken?: string,
): Promise<FetchApiResponse<TData>> => {
    try {
        const url = buildUrl(target);

        const mergedHeaders = new Headers(options.headers);

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
            ...options,
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

// generatePassword: build a 12+ character password with strong entropy while staying somewhat memorable
export function generatePassword(
    inputString: string,
    specifiedDigits?: number | string,
): string {
    const fallbackWords = [
        'aurora',
        'falcon',
        'ember',
        'harbor',
        'lagoon',
        'meadow',
        'nebula',
        'onyx',
        'prairie',
        'quartz',
        'ranger',
        'saffron',
        'tundra',
        'vertex',
        'willow',
        'zephyr',
    ];

    const alphaOnly = (inputString || '')
        .trim()
        .replace(/[^a-zA-Z]/g, '')
        .toLowerCase();
    const base =
        alphaOnly || fallbackWords[getRandomInt(fallbackWords.length) || 0];

    const digitsSource = (specifiedDigits ?? '')
        .toString()
        .replace(/\D/g, '')
        .slice(0, 6);

    const upperSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerSet = 'abcdefghijklmnopqrstuvwxyz';
    const digitSet = '0123456789';
    const specialSet = '!@#$%&*-_=+';
    const combinedSet = upperSet + lowerSet + digitSet + specialSet;

    const requiredChars: string[] = [];
    requiredChars.push(
        base ? base.charAt(0).toUpperCase() : pickRandom(upperSet),
    );
    requiredChars.push(
        base.length > 1 ? pickRandom(base.slice(1)) : pickRandom(lowerSet),
    );
    requiredChars.push(
        digitsSource ? digitsSource.charAt(0) : pickRandom(digitSet),
    );
    requiredChars.push(pickRandom(specialSet));

    const targetLength = Math.max(12, base.length + 6);
    const extras: string[] = digitsSource.split('').slice(1);

    while (requiredChars.length + extras.length < targetLength) {
        extras.push(pickRandom(combinedSet));
    }

    const passwordChars = [...requiredChars, ...extras].slice(0, targetLength);
    shuffleInPlace(passwordChars);
    return passwordChars.join('');
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

function shuffleInPlace(chars: string[]): void {
    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = getRandomInt(i + 1);
        const temp = chars[i];
        chars[i] = chars[j];
        chars[j] = temp;
    }
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

/**
 * Creates a delay for a specified number of milliseconds.
 * @param ms - The number of milliseconds to delay.
 * @returns A Promise that resolves after the specified delay.
 */
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
