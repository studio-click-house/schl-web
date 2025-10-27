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
    { value: 'finished', label: 'Finished' },
];
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
