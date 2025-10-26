import moment from 'moment-timezone';

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
 * Build a MongoDB date range filter for a date field using ISO date strings (YYYY-MM-DD).
 */
export const applyDateRange = <T extends Record<string, unknown>>(
    query: T,
    field: keyof T,
    fromDate?: string,
    toDate?: string,
) => {
    if (!fromDate && !toDate) return;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (fromDate) range.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDate) range.$lte = new Date(`${toDate}T23:59:59.999Z`);
    (query as Record<string, unknown>)[field as string] = range;
};

/**
 * Calculate the time difference in minutes between now and the given delivery date/time
 * using Asia/Dhaka timezone. If time is missing, defaults to 23:59.
 * Positive means time remaining; negative means overdue.
 */
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
