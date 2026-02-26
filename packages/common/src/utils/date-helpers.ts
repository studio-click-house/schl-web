import moment from 'moment-timezone';

export const getCurrentUtc = (): Date => {
    return moment().utc().toDate();
};

export const getTodayDate = (): string => moment().format('YYYY-MM-DD');

/**
 * Return an inclusive date range for the last N days ending today.
 * Example: daysAgo=30 -> from: 30 days ago (YYYY-MM-DD), to: today (YYYY-MM-DD)
 */
export const getDateRange = (daysAgo: number): { from: string; to: string } => {
    const to = moment();
    const from = moment().subtract(daysAgo, 'days');
    return { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
};

/**
 * Build a MongoDB date range filter. Defaults to Date objects; use { asString: true }
 * when the target field stores YYYY-MM-DD strings so plain string comparison works.
 */
type ApplyDateRangeOptions = {
    asString?: boolean;
};

export const applyDateRange = <T extends Record<string, unknown>>(
    query: T,
    field: keyof T,
    fromDate?: string,
    toDate?: string,
    options: ApplyDateRangeOptions = {},
) => {
    if (!fromDate && !toDate) return;

    const { asString = false } = options;

    const target = query as Record<string, unknown>;

    if (asString) {
        const normalizeUpperBound = (value: string) => {
            if (!value) return value;
            return value.includes('T') || value.includes(' ')
                ? value
                : `${value}~`;
        };

        target[field as string] = {
            ...(fromDate ? { $gte: fromDate } : {}),
            ...(toDate ? { $lte: normalizeUpperBound(toDate) } : {}),
        };
        return;
    }

    target[field as string] = {
        ...(fromDate ? { $gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
        ...(toDate ? { $lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
    };
};

export const YYYY_MM_DD_to_DD_MM_YY = (dateString: string) => {
    if (!dateString) return '';
    const date = moment(dateString, 'YYYY-MM-DD');
    if (!date.isValid()) return dateString;
    return date.format('DD-MM-YYYY');
};

export const ISO_to_DD_MM_YY = (isoDate: string) => {
    if (!isoDate) return '';
    const date = moment(isoDate);
    if (!date.isValid()) return '';
    return date.format('DD-MM-YYYY');
};

export const getTodayDate_DD_MM_YYYY = () => {
    return moment().format('DD-MM-YYYY');
};

export const formatTime = (time24?: string) => {
    if (!time24) return '';
    return moment(time24, 'HH:mm').format('hh:mm A');
};

export const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';

    return moment(dateString).format('Do MMM. YYYY');
};

export function formatTimestamp(timestamp: string | Date) {
    const formattedDate = moment(timestamp);

    return {
        date: formattedDate.format('DD-MM-YYYY') || '',
        time: formattedDate.format('HH:mm') || '',
    };
}

export const isoToLocalDateTime = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const m = moment(iso);
    if (!m.isValid()) return undefined;
    // format for <input type="datetime-local"> which expects local time
    return m.local().format('YYYY-MM-DDTHH:mm');
};

export const localDateTimeToISO = (local?: string): string | undefined => {
    if (!local) return undefined;
    const m = moment(local);
    if (!m.isValid()) return undefined;
    return m.toISOString();
};

export const toISODate = (
    dateStr: string,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
): Date | null => {
    if (!dateStr) {
        return moment().startOf('day').toDate(); // Default to start of today
    }

    const isoDate = moment.utc(dateStr);

    if (!isoDate.isValid()) {
        return null; // Return null if the date is invalid
    }

    return isoDate
        .set({
            hour: hours,
            minute: minutes,
            second: seconds,
            millisecond: milliseconds,
        })
        .toDate();
};

// used to generate graph data for date range
export function getDatesInRange(fromTime: string, toTime: string): string[] {
    const dates: string[] = [];
    const currentDate = moment(fromTime);
    const endDate = moment(toTime).endOf('day');

    while (currentDate.isSameOrBefore(endDate)) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate.add(1, 'day');
    }

    return dates;
}

export const getLast12Months = () => {
    const result: { monthAndYear: string }[] = [];
    const today = moment();
    for (let i = 0; i < 12; i++) {
        result.push({
            monthAndYear: today.format('YYYY-MM'), // Format as "YYYY-MM"
        });
        today.subtract(1, 'months');
    }
    return result.reverse(); // Reverse to start from oldest to newest
};

export function getMonthRange(monthAndYear: string): {
    start: string;
    end: string;
} {
    const [monthName, year] = monthAndYear.split(' ');
    const monthNumber = moment().month(monthName!).format('MM');
    const startDate = moment
        .tz(`${year}-${monthNumber}-01`, 'Asia/Dhaka')
        .startOf('month')
        .format('YYYY-MM-DD');
    const endDate = moment
        .tz(`${year}-${monthNumber}-01`, 'Asia/Dhaka')
        .endOf('month')
        .format('YYYY-MM-DD');
    return { start: startDate, end: endDate };
}

export const getDaysSince = (date: Date | string): number => {
    const currentDate = moment();
    const inputDate = moment(date);
    return currentDate.diff(inputDate, 'days');
};

export type RowColorStyle = { backgroundColor?: string };

/**
 * Returns an inline style object for row background color based on how many days have passed
 * since the last order date.
 * - 0-14 days: green (#dcfce7)
 * - 15-29 days: yellow (#fef9c3)
 * - 30+ days or no date: red (#fee2e2)
 */
export const getRowColorByLastOrderDate = (
    lastOrderDate: string | Date | null | undefined,
): RowColorStyle => {
    if (!lastOrderDate) return { backgroundColor: '#fee2e2' }; // red-100

    const daysSince = getDaysSince(lastOrderDate);

    if (daysSince >= 0 && daysSince <= 14) {
        return { backgroundColor: '#dcfce7' }; // green-100
    } else if (daysSince >= 15 && daysSince <= 29) {
        return { backgroundColor: '#fef9c3' }; // yellow-100
    }

    return { backgroundColor: '#fee2e2' }; // red-100 for 30+ days
};

export function daysToYMD(days: number) {
    const duration = moment.duration(days, 'days');
    const years = Math.floor(duration.asYears());
    const months = Math.floor(duration.asMonths() - years * 12);
    const remainingDays = Math.floor(
        duration.asDays() - years * 365 - months * 30,
    );

    return { years, months, days: remainingDays };
}

export function normalizeDateInput(value?: string) {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${year}-${month}-${day}`;
    }

    return undefined;
}
