import moment from 'moment-timezone';

export const getTodayDate = (): string => moment().format('YYYY-MM-DD');
