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

export const EMPLOYEE_DEPARTMENTS = [
    'Production',
    'Marketing',
    'Software',
    'Accounting',
    'Management',
    'HR',
    'Administration',
    'Others',
] as const;

export type EmployeeDepartment = (typeof EMPLOYEE_DEPARTMENTS)[number];

// Notice channels are the same as employee departments
export const NOTICE_CHANNELS = EMPLOYEE_DEPARTMENTS;
export type NoticeChannel = EmployeeDepartment;
