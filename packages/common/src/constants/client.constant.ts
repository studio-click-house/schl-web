export const CLIENT_COMMON_COUNTRY = [
    'Australia',
    'Denmark',
    'Finland',
    'Norway',
    'Sweden',
];
export type ClientCommonCountry = (typeof CLIENT_COMMON_COUNTRY)[number];

export const CLIENT_CURRENCY = [
    '$',
    '€',
    '£',
    'A$',
    'C$',
    'NOK',
    'DKK',
    'SEK',
] as const;
export type ClientCurrency = (typeof CLIENT_CURRENCY)[number];

export const orderFrequencyOptions = [
    { value: 'consistent', label: 'Consistent (0–14 days)' },
    { value: 'regular', label: 'Regular (15–29 days)' },
    { value: 'irregular', label: 'Irregular (30+ days or no orders)' },
];

export const ORDER_FREQUENCIES = [
    'consistent',
    'regular',
    'irregular',
] as const;
export type OrderFrequency = (typeof ORDER_FREQUENCIES)[number];
