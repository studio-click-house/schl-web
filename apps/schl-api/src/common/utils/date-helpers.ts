import moment from 'moment-timezone';

export const getTodayDate = (): string => moment().format('YYYY-MM-DD');

/**
 * Build a MongoDB date range filter for a date field using ISO date strings (YYYY-MM-DD).
 */
export const applyDateRange = <T extends Record<string, any>>(
    query: T,
    field: keyof T,
    fromDate?: string,
    toDate?: string,
) => {
    if (!fromDate && !toDate) return;
    const range: { $gte?: Date; $lte?: Date } = {};
    if (fromDate) range.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDate) range.$lte = new Date(`${toDate}T23:59:59.999Z`);
    (query as any)[field] = range;
};
