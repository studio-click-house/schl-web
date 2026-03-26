import { SHIFT_TYPES } from '@repo/common/constants/shift.constant';
import { z } from 'zod';

const validateDateRange = (data: { fromDate: string; toDate: string }) => {
    return new Date(data.toDate) >= new Date(data.fromDate);
};

// Schema for bulk shift plan creation
export const shiftPlanValidationSchema = z
    .object({
        employeeIds: z
            .array(z.string())
            .min(1, 'At least one employee is required'),
        fromDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'From date must be in YYYY-MM-DD format',
            ),
        toDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'To date must be in YYYY-MM-DD format',
            ),
        shiftType: z.enum(SHIFT_TYPES, {
            errorMap: () => ({
                message:
                    'Shift type must be morning, evening, night, or custom',
            }),
        }),
        shiftStart: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Shift start time must be in HH:mm format')
            .optional(),
        shiftEnd: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Shift end time must be in HH:mm format')
            .optional(),
        gracePeriodMinutes: z.coerce.number().int().min(0).max(120).default(10),
        comment: z.string().optional(),
    })
    .refine(validateDateRange, {
        message: 'End date cannot be before start date',
        path: ['toDate'],
    });

// Schema for editing shift plans
export const shiftPlanEditSchema = z
    .object({
        fromDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'From date must be in YYYY-MM-DD format',
            ),
        toDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'To date must be in YYYY-MM-DD format',
            ),
        shiftType: z.enum(SHIFT_TYPES, {
            errorMap: () => ({
                message:
                    'Shift type must be morning, evening, night, or custom',
            }),
        }),
        shiftStart: z
            .string()
            .regex(
                /^(\d{2}):(\d{2})$/,
                'Shift start time must be in HH:mm format',
            ),
        shiftEnd: z
            .string()
            .regex(
                /^(\d{2}):(\d{2})$/,
                'Shift end time must be in HH:mm format',
            ),
        active: z.boolean().optional(),
        gracePeriodMinutes: z.coerce.number().int().min(0).max(120).optional(),
        comment: z.string().optional(),
    })
    .refine(validateDateRange, {
        message: 'End date cannot be before start date',
        path: ['toDate'],
    });

export type ShiftPlanFormData = z.infer<typeof shiftPlanValidationSchema>;
export type ShiftPlanEditData = z.infer<typeof shiftPlanEditSchema>;
