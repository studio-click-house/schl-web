export const EXEMPT_DEPARTMENTS = [
    'HR',
    'Administration',
    'Management',
] as const;
export type ExemptDepartment = (typeof EXEMPT_DEPARTMENTS)[number];
