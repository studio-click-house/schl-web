export const STANDARD_SHIFTS = {
    morning: { start: '07:00', end: '15:00', crossesMidnight: false },
    evening: { start: '15:00', end: '23:00', crossesMidnight: false },
    night: { start: '23:00', end: '07:00', crossesMidnight: true },
} as const;

export type StandardShiftType = keyof typeof STANDARD_SHIFTS;

export const standardShiftOptions = Object.keys(STANDARD_SHIFTS).map((key) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
}));
