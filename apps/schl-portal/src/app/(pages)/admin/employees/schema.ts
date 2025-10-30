import {
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_DEPARTMENTS,
    EMPLOYEE_STATUSES,
} from '@repo/common/constants/employee.constant';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z
    .object({
        e_id: z.string().min(1, 'Employee ID is required.'),
        real_name: z.string().min(1, 'Real Name is required.'),
        joining_date: z.string().min(1, 'Joining Date is required.'),
        phone: z.string().min(1, 'Phone is required.'),
        email: z
            .optional(z.string().email('This is not a valid email.'))
            .default(''),
        birth_date: z.string(),
        nid: z.string(),
        blood_group: z.optional(z.enum(EMPLOYEE_BLOOD_GROUPS)),
        designation: z.string(),
        department: z.enum(EMPLOYEE_DEPARTMENTS),
        gross_salary: z.number(),
        bonus_eid_ul_fitr: z.optional(z.number()).default(0),
        bonus_eid_ul_adha: z.optional(z.number()).default(0),
        status: z.enum(EMPLOYEE_STATUSES),
        provident_fund: z.number(),
        pf_start_date: z.string(),
        pf_history: z.optional(
            z.array(
                z.object({
                    date: z.string(),
                    gross: z.number(),
                    provident_fund: z.number(),
                    saved_amount: z.number(),
                    note: z.string(),
                }),
            ),
        ),
        branch: z.string(),
        division: z.string(),
        company_provided_name: z.optional(z.string()).nullable().default(null),
        note: z.optional(z.string()).default(''),
        _id: z.optional(
            z.string().refine(val => {
                return mongoose.Types.ObjectId.isValid(val);
            }),
        ),
        createdAt: z.optional(z.union([z.date(), z.string()])),
        updatedAt: z.optional(z.union([z.date(), z.string()])),
        __v: z.optional(z.number()),
    })
    .refine(
        data =>
            // Parse the PF start date and check if it's same or before today (by day)
            moment(data.pf_start_date, 'YYYY-MM-DD').isSameOrBefore(
                moment(),
                'day',
            ),
        {
            message: "PF Start Date must be today's date or before",
            path: ['pf_start_date'],
        },
    )
    .refine(
        data => {
            // If department is Marketing, company_provided_name must be provided
            if (data.department === 'Marketing') {
                return Boolean(data.company_provided_name?.trim().length);
            }
            // Otherwise, no requirement
            return true;
        },
        {
            message:
                'Company Provided Name is required for Marketing Department',
            path: ['company_provided_name'],
        },
    );

export type EmployeeDataType = z.infer<typeof validationSchema>;
