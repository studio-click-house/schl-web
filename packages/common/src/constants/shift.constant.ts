export const STANDARD_SHIFTS = {
    morning: { start: '07:00', end: '15:00', crossesMidnight: false },
    evening: { start: '15:00', end: '23:00', crossesMidnight: false },
    night: { start: '23:00', end: '07:00', crossesMidnight: true },
} as const;

export type StandardShiftType = keyof typeof STANDARD_SHIFTS;

export const standardShiftOptions = Object.keys(STANDARD_SHIFTS).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
}));

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const shiftTypeOptions = [
    { value: 'morning', label: 'Morning (7:00 AM - 3:00 PM)' },
    { value: 'evening', label: 'Evening (3:00 PM - 11:00 PM)' },
    { value: 'night', label: 'Night (11:00 PM - 7:00 AM)' },
    { value: 'custom', label: 'Custom Times' },
] as const;

export const SHIFT_ADJUSTMENT_TYPES = ['replace', 'cancel', 'off_day'] as const;
export type ShiftAdjustmentType = (typeof SHIFT_ADJUSTMENT_TYPES)[number];
export const adjustmentTypeOptions = [
    { value: 'replace', label: 'Replace (set new shift)' },
    { value: 'off_day', label: 'Off Day (mark as OT)' },
    { value: 'cancel', label: 'Cancel (no shift)' },
] as const;

export const SHIFT_RESOLVED_SOURCES = [
    'plan',
    'adjustment',
    'leave',
    'holiday',
] as const;
export type ShiftResolvedSource = (typeof SHIFT_RESOLVED_SOURCES)[number];
