// src/common/constants/employee.constant.ts
export const EMPLOYEE_STATUSES = [
    'active',
    'inactive',
    'terminated',
    'on-leave',
    'resigned',
    'retired',
    'fired',
] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_BLOOD_GROUPS = [
    'a+',
    'a-',
    'b+',
    'b-',
    'o+',
    'o-',
    'ab+',
    'ab-',
] as const;

export type EmployeeBloodGroup = (typeof EMPLOYEE_BLOOD_GROUPS)[number];

export const EMPLOYEE_SERVICE_TIME = [
    'lessThan1Year',
    'atLeast1Year',
    'atLeast2Years',
    'atLeast3Years',
    'moreThan3Years',
] as const;

export type EmployeeServiceTime = (typeof EMPLOYEE_SERVICE_TIME)[number];
