export const TICKET_STATUSES = [
    'new',
    'in-review', // pending
    'accepted',
    'rejected',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'in-review', label: 'In Review' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
];

export const TICKET_TYPES = ['bug', 'feature', 'improvement'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const typeOptions = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' },
    { value: 'improvement', label: 'Improvement' },
];
