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
