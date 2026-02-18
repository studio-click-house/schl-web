// WE ARE FOLLOWING THE KANBAN METHODOLOGY FOR BACKLOG MANAGEMENT

export const BACKLOG_STATUSES = [
    'backlog', // not ready
    'ready', // ready for sprint
    'in-progress', // actively being worked on
    'halt', // work is halted
    'review', // peer review
    'testing', // QA
    'done', // completed and accepted
] as const;
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];

export const statusOptions = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'ready', label: 'Ready' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'halt', label: 'Halt' },
    { value: 'review', label: 'Review' },
    { value: 'testing', label: 'Testing' },
    { value: 'done', label: 'Done' },
];

export const BACKLOG_PRIORITIES = [
    'low',
    'medium',
    'high',
    'critical',
] as const;
export type BacklogPriority = (typeof BACKLOG_PRIORITIES)[number];

export const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];
