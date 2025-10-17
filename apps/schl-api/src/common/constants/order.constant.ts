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

export const ORDER_PRIORITIES = ['low', 'medium', 'high'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];
