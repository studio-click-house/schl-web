export const LEAVE_TYPES = [
    'casual',
    'emergency',
    'marriage',
    'unpaid',
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const leaveTypeOptions = LEAVE_TYPES.map(t => ({
    label: `${t.charAt(0).toUpperCase()}${t.slice(1)} Leave`,
    value: t,
}));

export const leavePaidOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
];
