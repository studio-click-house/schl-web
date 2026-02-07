import moment from 'moment-timezone';

export interface OTCalculationInput {
    in_time: Date;
    out_time: Date | null;
    shift_start: string; // "HH:mm"
    shift_end: string; // "HH:mm"
    shift_date: Date;
    crosses_midnight: boolean;
}

/**
 * Calculate overtime minutes based on actual attendance and shift plan
 *
 * Formula:
 * - Extra Work = Extra out-time - Late In-time (early in-time is negative, so it adds to extra work)
 * - If Extra Work < 25min → OT = 0
 * - If 25min <= Extra Work < 55min → OT = 30min
 * - If Extra Work >= 55min → OT = 60min
 *
 * @param input - Attendance and shift plan details
 * @returns Overtime in minutes (0, 30, or 60)
 */
export function calculateOT(input: OTCalculationInput): number {
    if (!input.out_time) {
        return 0; // Cannot calculate OT without check-out time
    }

    const shiftDate = moment.tz(input.shift_date, 'Asia/Dhaka').startOf('day');
    const [startHour, startMin] = input.shift_start.split(':').map(Number);
    const [endHour, endMin] = input.shift_end.split(':').map(Number);

    const expectedStart = shiftDate.clone().hour(startHour).minute(startMin);
    let expectedEnd = shiftDate.clone().hour(endHour).minute(endMin);

    // If shift crosses midnight, end time is on the next day
    if (input.crosses_midnight) {
        expectedEnd = expectedEnd.add(1, 'day');
    }

    const actualIn = moment.tz(input.in_time, 'Asia/Dhaka');
    const actualOut = moment.tz(input.out_time, 'Asia/Dhaka');

    // Late in-time (positive if late, negative if early)
    const lateMinutes = actualIn.diff(expectedStart, 'minutes');

    // Extra out-time (positive if stayed late, negative if left early)
    const extraOutMinutes = actualOut.diff(expectedEnd, 'minutes');

    // Extra work = extraOut - lateIn (early in-time adds to extra work)
    const extraWork = extraOutMinutes - lateMinutes;

    // Apply OT rules
    if (extraWork < 25) {
        return 0;
    } else if (extraWork >= 25 && extraWork < 55) {
        return 30;
    } else {
        return 60; // >= 55 minutes
    }
}

/**
 * Determine which shift date an attendance timestamp belongs to
 *
 * Logic:
 * - If shift crosses midnight and current time is before shift start time,
 *   it belongs to the previous day's shift
 * - Otherwise, it belongs to the current calendar day's shift
 *
 * @param timestamp - The attendance timestamp
 * @param shiftPlan - Optional shift plan details
 * @returns The shift date (business day)
 */
export function determineShiftDate(
    timestamp: Date,
    shiftPlan?: { shift_start: string; crosses_midnight: boolean },
): Date {
    const momentTime = moment.tz(timestamp, 'Asia/Dhaka');

    if (!shiftPlan) {
        // No shift plan: use calendar date
        return momentTime.startOf('day').toDate();
    }

    const [shiftHour] = shiftPlan.shift_start.split(':').map(Number);

    // If shift crosses midnight and current time is before shift start hour
    // (e.g., 1:30 AM but shift starts at 3 PM), this belongs to previous day's shift
    if (shiftPlan.crosses_midnight && momentTime.hour() < shiftHour) {
        return momentTime.subtract(1, 'day').startOf('day').toDate();
    }

    return momentTime.startOf('day').toDate();
}
