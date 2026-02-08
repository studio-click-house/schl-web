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
 * Rules:
 * - Extra Work < 1 hour: Tiered (0, 30, or 60 mins)
 * - Extra Work 1-8 hours: Linear ratio (0.8125 multiplier, min 60 mins)
 * - Extra Work > 8 hours: Full days (390 mins = 6.5 hrs each) + remainder
 *
 * @param input - Attendance and shift plan details
 * @returns Overtime in minutes
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

    // No OT if no extra work
    if (extraWork <= 0) {
        return 0;
    }

    // Apply tiered OT rules based on range
    if (extraWork < 60) {
        return calculateShortOT(extraWork);
    } else if (extraWork <= 480) {
        // 1-8 hours: Linear ratio with 60-minute floor
        return Math.max(60, Math.round(extraWork * 0.8125));
    } else {
        // > 8 hours: Full days (390 mins each) + remainder
        return calculateFullDayOT(extraWork);
    }
}

/**
 * Short OT calculation for < 1 hour extra work
 */
function calculateShortOT(minutes: number): number {
    if (minutes < 25) return 0;
    if (minutes >= 25 && minutes < 55) return 30;
    return 60; // >= 55 minutes
}

/**
 * Full day OT calculation for > 8 hours extra work
 */
function calculateFullDayOT(minutes: number): number {
    const fullDays = Math.floor(minutes / 480);
    const remainingMins = minutes % 480;

    // Each full 8-hour day credits 6.5 hours (390 mins) of OT
    let otMinutes = fullDays * 390;

    // Handle remainder
    if (remainingMins >= 60) {
        // Apply linear ratio to remaining hours
        otMinutes += Math.max(60, Math.round(remainingMins * 0.8125));
    } else if (remainingMins > 0) {
        // Apply tiered rules to remaining minutes
        otMinutes += calculateShortOT(remainingMins);
    }

    return otMinutes;
}

/**
 * Format OT minutes to HH:MM format
 */
export function formatOT(otMinutes: number): string {
    const hours = Math.floor(otMinutes / 60);
    const mins = otMinutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert OT minutes to decimal hours
 */
export function getOTInHours(otMinutes: number): number {
    return Math.round((otMinutes / 60) * 100) / 100;
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
