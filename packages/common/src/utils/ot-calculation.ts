import moment from 'moment-timezone';

export interface OTCalculationInput {
    in_time: Date;
    out_time: Date | null;
    shift_start: string; // "HH:mm"
    shift_end: string; // "HH:mm"
    shift_date: Date;
    crosses_midnight: boolean;
}

export interface OTResult {
    extra_work_minutes: number;
    ot_minutes: number;
    net_ot_minutes: number;
}

/**
 * Calculate overtime minutes based on actual attendance and shift plan
 *
 * Rules:
 * 1. Extra Work: raw minutes (stays late minus late in)
 * 2. OT (Rounded): nearest 30-minute block with 5-minute grace
 *    (Formula: floor((extra_work + 5) / 30) * 30)
 * 3. Net OT: Rounded * 0.8125 multiplier
 *
 * @param input - Attendance and shift plan details
 * @returns OTResult with extra_work, ot, and net_ot
 */
export function calculateOT(input: OTCalculationInput): OTResult {
    if (!input.out_time) {
        return { extra_work_minutes: 0, ot_minutes: 0, net_ot_minutes: 0 };
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

    return calculateOTFromMinutes(extraWork);
}

/**
 * Calculate OT directly from worked minutes
 * (Universal for both regular and off-day OT)
 */
export function calculateOTFromMinutes(minutes: number): OTResult {
    if (minutes <= 0) {
        return { extra_work_minutes: 0, ot_minutes: 0, net_ot_minutes: 0 };
    }

    // New Rounding Rule: nearest 30m block with 5m grace
    const ot_minutes = Math.floor((minutes + 5) / 30) * 30;
    const net_ot_minutes = ot_minutes * 0.8125;

    return {
        extra_work_minutes: minutes,
        ot_minutes,
        net_ot_minutes,
    };
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
 * @param shift - Optional shift details (start time and midnight crossing info)
 * @returns The shift date (business day)
 */
export function determineShiftDate(
    timestamp: Date,
    shift?: { shift_start: string; crosses_midnight: boolean },
): Date {
    const momentTime = moment.tz(timestamp, 'Asia/Dhaka');

    if (!shift) {
        // No shift plan: use calendar date
        return momentTime.startOf('day').toDate();
    }

    const [shiftHour] = shift.shift_start.split(':').map(Number);

    // If shift crosses midnight and current time is before shift start hour
    // (e.g., 1:30 AM but shift starts at 3 PM), this belongs to previous day's shift
    if (shift.crosses_midnight && momentTime.hour() < shiftHour) {
        return momentTime.subtract(1, 'day').startOf('day').toDate();
    }

    return momentTime.startOf('day').toDate();
}
