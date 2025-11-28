/*
ORDER_STATUSES is an order-level lifecycle enum (running, paused, finished, correction, etc.). It describes the status for the whole order (the order document level).

WORK_CATEGORIES (production/qc/correction) is a progress-level enum describing the type of work or activity a particular progress entry (employee activity) is doing. It isn’t the same as the overall order status.

FILE_STATUSES is a file-level runtime state (working/paused/completed/...), used to track a specific file's state inside files_tracking.

Domain separation: Order status describes global/aggregate stage; work category describes what type of work an employee is doing; file status describes an individual file lifecycle.

*/

export const ORDER_STATUSES = [
    'running',
    'uploaded',
    'paused',
    'client-hold',
    'finished',
    'correction',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = ['general', 'test'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const statusOptions = [
    { value: 'running', label: 'Running' },
    { value: 'uploaded', label: 'Uploaded' },
    { value: 'paused', label: 'Paused' },
    { value: 'client-hold', label: 'Client hold' },
    { value: 'correction', label: 'Correction' },
    { value: 'finished', label: 'Finished' },
];

export const FILE_STATUSES = [
    'working', // Currently active
    'paused', // Paused by employee
    'completed', // Done
    'cancelled', // Walkout/Incomplete
    'transferred', // Moved to another employee
] as const;

export type FileStatus = (typeof FILE_STATUSES)[number];

// To handle General, QC, Correction explicitly in history
export const WORK_CATEGORIES = ['production', 'qc', 'correction'] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export const taskOptions = [
    { value: 'Ghost Mannequine', label: 'Ghost Mannequine' },
    { value: 'Banner', label: 'Banner' },
    { value: 'Background erase', label: 'Background erase' },
    { value: 'Color correction', label: 'Color correction' },
    { value: 'Illustrator work', label: 'Illustrator work' },
    { value: 'Retouch', label: 'Retouch' },
    { value: 'Shadow', label: 'Shadow' },
    { value: 'Neck shot', label: 'Neck shot' },
    { value: 'SPM', label: 'SPM' },
    { value: 'CP', label: 'CP' },
    { value: 'Neck', label: 'Neck' },
    { value: 'Multipath', label: 'Multipath' },
    { value: 'Pattern change', label: 'Pattern change' },
    { value: 'Color change', label: 'Color change' },
    { value: '3D Neck shot', label: '3D Neck shot' },
    { value: 'Liquify retouch', label: 'Liquify retouch' },
    { value: 'Trade retouch', label: 'Trade retouch' },
    { value: 'Language change', label: 'Language change' },
    { value: 'Simple retouch', label: 'Simple retouch' },
    { value: 'High-end retouch', label: 'High-end retouch' },
    { value: 'Liquify', label: 'Liquify' },
    { value: 'Shadow original', label: 'Shadow original' },
    { value: 'Symmetry liquify', label: 'Symmetry liquify' },
    { value: 'Video Retouch', label: 'Video Retouch' },
    { value: 'Resize', label: 'Resize' },
    { value: 'Masking', label: 'Masking' },
    { value: 'Dusting', label: 'Dusting' },
    { value: 'Cropping', label: 'Cropping' },
    { value: 'Background change', label: 'Background change' },
    { value: 'Transparent background', label: 'Transparent background' },
    { value: 'Others', label: 'Others' },
];

export const typeOptions = [
    { value: 'general', label: 'General' },
    { value: 'test', label: 'Test' },
];
export const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];
export const JOB_SHIFTS = ['morning', 'evening'] as const;
export type JobShift = (typeof JOB_SHIFTS)[number];

export const jobShiftOptions = [
    { value: 'morning', label: 'Morning' },
    { value: 'evening', label: 'Evening' },
];

export const JOB_SELECTION_TYPES = [
    'General',
    'Test',
    'QC - General',
    'QC - Test',
    'Correction - General',
    'Correction - Test',
] as const;

export type JobSelectionType = (typeof JOB_SELECTION_TYPES)[number];

export const jobSelectionOptions = [
    { value: 'General', label: 'General' },
    { value: 'Test', label: 'Test' },
    { value: 'QC - General', label: 'QC - General' },
    { value: 'QC - Test', label: 'QC - Test' },
    { value: 'Correction - General', label: 'Correction - General' },
    { value: 'Correction - Test', label: 'Correction - Test' },
];
