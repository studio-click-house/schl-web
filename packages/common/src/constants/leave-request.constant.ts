export const LEAVE_REQUEST_TYPES = [
    'casual',
    'emergency',
    'marriage',
    'unpaid',
] as const;
export type LeaveRequestType = (typeof LEAVE_REQUEST_TYPES)[number];

export const leaveRequestTypeOptions = LEAVE_REQUEST_TYPES.map(t => ({
    label: `${t.charAt(0).toUpperCase()}${t.slice(1)} Leave`,
    value: t,
}));

export const leaveRequestPaidOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
];
