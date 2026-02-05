import * as moment from 'moment-timezone';

export interface ShiftTiming {
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    crosses_midnight: boolean;
    grace_minutes: number;
}

export interface OvertimeResult {
    scheduledMinutes: number; // expected work time per shift (excluding breaks)
    actualMinutes: number; // actual work time (from check-in to check-out)
    overtimeMinutes: number; // extra minutes worked beyond scheduled time
    undertimeMinutes: number; // minutes short of scheduled time
    isLate: boolean; // arrived after grace period
    lateMinutes: number; // minutes late (beyond grace)
    isEarlyDeparture: boolean; // left before shift end
    earlyDepartureMinutes: number; // minutes left early
    isHolidayWork: boolean; // worked on a holiday/weekend
    holidayOvertimeMinutes: number; // overtime from working on holiday (all work time counts)
}

export interface OvertimeOptions {
    isHoliday?: boolean; // If true, all work time counts as overtime
}

/**
 * Parse time string (HH:mm) into moment object for a given date
 */
function parseShiftTime(
    timeStr: string,
    baseDate: moment.Moment,
    isEndTime: boolean,
    crossesMidnight: boolean,
): moment.Moment {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = baseDate.clone().hour(hours).minute(minutes).second(0);

    // If shift crosses midnight and this is the end time, add a day
    if (isEndTime && crossesMidnight) {
        result.add(1, 'day');
    }

    return result;
}

/**
 * Calculate overtime based on shift timing and actual attendance
 * @param inTime Check-in time
 * @param outTime Check-out time
 * @param shiftTiming Shift configuration
 * @param options Optional settings (e.g., isHoliday)
 */
export function calculateOvertime(
    inTime: Date,
    outTime: Date | null,
    shiftTiming: ShiftTiming,
    options: OvertimeOptions = {},
): OvertimeResult {
    const { isHoliday = false } = options;

    if (!outTime) {
        // Session still open, cannot calculate
        return {
            scheduledMinutes: 0,
            actualMinutes: 0,
            overtimeMinutes: 0,
            undertimeMinutes: 0,
            isLate: false,
            lateMinutes: 0,
            isEarlyDeparture: false,
            earlyDepartureMinutes: 0,
            isHolidayWork: isHoliday,
            holidayOvertimeMinutes: 0,
        };
    }

    const inMoment = moment.tz(inTime, 'Asia/Dhaka');
    const outMoment = moment.tz(outTime, 'Asia/Dhaka');
    const dateBase = inMoment.clone().startOf('day');

    // Parse shift start and end times
    const shiftStart = parseShiftTime(
        shiftTiming.start_time,
        dateBase,
        false,
        shiftTiming.crosses_midnight,
    );
    const shiftEnd = parseShiftTime(
        shiftTiming.end_time,
        dateBase,
        true,
        shiftTiming.crosses_midnight,
    );
    const graceEnd = shiftStart
        .clone()
        .add(shiftTiming.grace_minutes, 'minutes');

    // Calculate scheduled work time
    const scheduledMinutes = shiftEnd.diff(shiftStart, 'minutes');

    // Calculate actual work time
    const actualMinutes = outMoment.diff(inMoment, 'minutes');

    // If working on a holiday, all actual work time counts as overtime
    if (isHoliday) {
        return {
            scheduledMinutes: 0, // No scheduled work on holidays
            actualMinutes,
            overtimeMinutes: actualMinutes, // All work is overtime
            undertimeMinutes: 0,
            isLate: false, // No late concept on holidays
            lateMinutes: 0,
            isEarlyDeparture: false,
            earlyDepartureMinutes: 0,
            isHolidayWork: true,
            holidayOvertimeMinutes: actualMinutes,
        };
    }

    // Regular day calculations
    // Check if late (arrived after grace period)
    const isLate = inMoment.isAfter(graceEnd);
    const lateMinutes = isLate ? inMoment.diff(shiftStart, 'minutes') : 0;

    // Check for early departure
    const isEarlyDeparture = outMoment.isBefore(shiftEnd);
    const earlyDepartureMinutes = isEarlyDeparture
        ? shiftEnd.diff(outMoment, 'minutes')
        : 0;

    // Calculate overtime/undertime
    const overtimeMinutes = Math.max(0, actualMinutes - scheduledMinutes);
    const undertimeMinutes = Math.max(0, scheduledMinutes - actualMinutes);

    return {
        scheduledMinutes,
        actualMinutes,
        overtimeMinutes,
        undertimeMinutes,
        isLate,
        lateMinutes,
        isEarlyDeparture,
        earlyDepartureMinutes,
        isHolidayWork: false,
        holidayOvertimeMinutes: 0,
    };
}

/**
 * Calculate working hours summary for a period
 */
export interface WorkingHoursSummary {
    totalScheduledMinutes: number;
    totalActualMinutes: number;
    totalOvertimeMinutes: number;
    totalUndertimeMinutes: number;
    totalLateDays: number;
    totalLateMinutes: number;
    totalEarlyDepartures: number;
    totalEarlyDepartureMinutes: number;
    attendanceDays: number;
    holidayWorkDays: number;
    totalHolidayOvertimeMinutes: number;
}

export function calculateWorkingHoursSummary(
    overtimeResults: OvertimeResult[],
): WorkingHoursSummary {
    return overtimeResults.reduce(
        (summary, result) => ({
            totalScheduledMinutes:
                summary.totalScheduledMinutes + result.scheduledMinutes,
            totalActualMinutes:
                summary.totalActualMinutes + result.actualMinutes,
            totalOvertimeMinutes:
                summary.totalOvertimeMinutes + result.overtimeMinutes,
            totalUndertimeMinutes:
                summary.totalUndertimeMinutes + result.undertimeMinutes,
            totalLateDays: summary.totalLateDays + (result.isLate ? 1 : 0),
            totalLateMinutes: summary.totalLateMinutes + result.lateMinutes,
            totalEarlyDepartures:
                summary.totalEarlyDepartures +
                (result.isEarlyDeparture ? 1 : 0),
            totalEarlyDepartureMinutes:
                summary.totalEarlyDepartureMinutes +
                result.earlyDepartureMinutes,
            attendanceDays: summary.attendanceDays + 1,
            holidayWorkDays:
                summary.holidayWorkDays + (result.isHolidayWork ? 1 : 0),
            totalHolidayOvertimeMinutes:
                summary.totalHolidayOvertimeMinutes +
                result.holidayOvertimeMinutes,
        }),
        {
            totalScheduledMinutes: 0,
            totalActualMinutes: 0,
            totalOvertimeMinutes: 0,
            totalUndertimeMinutes: 0,
            totalLateDays: 0,
            totalLateMinutes: 0,
            totalEarlyDepartures: 0,
            totalEarlyDepartureMinutes: 0,
            attendanceDays: 0,
            holidayWorkDays: 0,
            totalHolidayOvertimeMinutes: 0,
        },
    );
}

/**
 * Format minutes into hours and minutes string
 */
export function formatMinutesToHoursMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else {
        return `${mins}m`;
    }
}

/**
 * Default weekend days for departments
 * Most departments have Saturday and Sunday off,
 * but some (like Production) only have Sunday off
 */
export const DEFAULT_WEEKEND_DAYS = ['saturday', 'sunday'] as const;

/**
 * Day names mapping (0 = Sunday, 6 = Saturday)
 */
const DAY_NAMES = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
] as const;

/**
 * Check if a date falls on a weekend day for the given configuration
 * @param date The date to check
 * @param weekendDays Array of weekend day names (e.g., ['saturday', 'sunday'])
 */
export function isWeekendDay(
    date: Date,
    weekendDays: readonly string[] = DEFAULT_WEEKEND_DAYS,
): boolean {
    const dayOfWeek = moment.tz(date, 'Asia/Dhaka').day();
    const dayName = DAY_NAMES[dayOfWeek];
    return weekendDays.includes(dayName);
}

/**
 * Get the day name for a date
 */
export function getDayName(date: Date): string {
    const dayOfWeek = moment.tz(date, 'Asia/Dhaka').day();
    return DAY_NAMES[dayOfWeek];
}
