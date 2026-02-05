/**
 * Shift types supported by the system
 */
export const SHIFT_TYPES = ['morning', 'evening'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

/**
 * Days of the week for scheduling
 */
export const WEEK_DAYS = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

/**
 * Default shift timings (24-hour format HH:mm)
 * These can be customized per organization in the Shift schema
 */
export const DEFAULT_SHIFT_TIMINGS = {
    morning: {
        startTime: '09:00',
        endTime: '17:00',
        graceMinutes: 15, // grace period for late arrival
    },
    evening: {
        startTime: '17:00',
        endTime: '01:00', // next day
        graceMinutes: 15,
    },
} as const;

/**
 * Target types for applying holidays/leaves
 */
export const HOLIDAY_TARGET_TYPES = [
    'all', // applies to all employees
    'shift', // applies to employees on a specific shift
    'individual', // applies to specific employees
] as const;
export type HolidayTargetType = (typeof HOLIDAY_TARGET_TYPES)[number];

/**
 * Holiday/Leave types
 */
export const HOLIDAY_TYPES = [
    'full_day', // full day off
    'half_day', // half day (morning or evening off)
    'vacation', // planned vacation
] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

/**
 * Leave payment types
 */
export const LEAVE_PAYMENT_TYPES = ['paid', 'unpaid'] as const;
export type LeavePaymentType = (typeof LEAVE_PAYMENT_TYPES)[number];

/**
 * Half-day period (which half is off)
 */
export const HALF_DAY_PERIODS = ['first_half', 'second_half'] as const;
export type HalfDayPeriod = (typeof HALF_DAY_PERIODS)[number];
