export const TICKET_STATUSES = [
    'new',
    'backlog', // not ready
    'ready', // ready for sprint
    'in-progress', // actively being worked on
    'halt', // work is halted
    'review', // peer review
    'testing', // QA
    'resolved', // resolved
    'done', // completed and accepted
    'no-work', // no work needed
    'rejected', // rejected
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'backlog', label: 'Backlog' },
    { value: 'ready', label: 'Ready' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'halt', label: 'Halt' },
    { value: 'review', label: 'Review' },
    { value: 'testing', label: 'Testing' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'done', label: 'Done' },
    { value: 'no-work', label: 'No Work' },
    { value: 'rejected', label: 'Rejected' },
];

export const TICKET_TYPES = ['bug', 'feature', 'improvement'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const typeOptions = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' },
    { value: 'improvement', label: 'Improvement' },
];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];
