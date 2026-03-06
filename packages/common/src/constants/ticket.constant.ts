export const TICKET_STATUSES = [
    'pending', // waiting for assignee to start
    'in-progress', // work started
    'on-hold', // waiting for something
    'finished', // solution done
    'rejected', // not accepted / invalid
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CLOSED_TICKET_STATUSES: TicketStatus[] = ['finished', 'rejected'];

export const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'finished', label: 'Finished' },
    { value: 'rejected', label: 'Rejected' },
];

export const TICKET_TYPES = [
    'complaint',
    'bug',
    'feature',
    'improvement',
    'request',
] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const typeOptions = [
    { value: 'complaint', label: 'Complaint' },
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'request', label: 'Request' },
];
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];
