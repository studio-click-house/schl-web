import { z } from 'zod';

// Schema for bulk shift plan creation
export const shiftPlanValidationSchema = z.object({
    employeeIds: z
        .array(z.string())
        .min(1, 'At least one employee is required'),
    fromDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format'),
    toDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format'),
    shiftType: z.enum(['morning', 'evening', 'night', 'custom'], {
        errorMap: () => ({
            message: 'Shift type must be morning, evening, night, or custom',
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
});

// Schema for editing shift plans
export const shiftPlanEditSchema = z.object({
    fromDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format'),
    toDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format'),
    shiftType: z.enum(['morning', 'evening', 'night', 'custom'], {
        errorMap: () => ({
            message: 'Shift type must be morning, evening, night, or custom',
        }),
    }),
    shiftStart: z
        .string()
        .regex(/^(\d{2}):(\d{2})$/, 'Shift start time must be in HH:mm format'),
    shiftEnd: z
        .string()
        .regex(/^(\d{2}):(\d{2})$/, 'Shift end time must be in HH:mm format'),
    active: z.boolean().optional(),
    gracePeriodMinutes: z.coerce.number().int().min(0).max(120).optional(),
    comment: z.string().optional(),
});

// Schema for single-day adjustment
export const shiftAdjustmentSchema = z
    .object({
        employeeId: z.string().min(1, 'Employee is required'),
        shiftDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'Shift date must be in YYYY-MM-DD format',
            ),
        adjustmentType: z.enum(['replace', 'cancel', 'off_day'], {
            errorMap: () => ({ message: 'Adjustment type is required' }),
        }),
        shiftType: z.enum(['morning', 'evening', 'night', 'custom']).optional(),
        shiftStart: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Shift start time must be in HH:mm format')
            .optional(),
        shiftEnd: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Shift end time must be in HH:mm format')
            .optional(),
        gracePeriodMinutes: z.coerce.number().int().min(0).max(120).optional(),
        comment: z.string().optional(),
    })
    .refine(
        data => {
            // For 'replace' adjustments we require shift details; 'cancel' and 'off_day' do not require them
            if (data.adjustmentType === 'replace') {
                return Boolean(
                    data.shiftType && data.shiftStart && data.shiftEnd,
                );
            }
            return true;
        },
        {
            message:
                'Shift type, start time, and end time are required for replace adjustments',
            path: ['shiftType'],
        },
    );

export type ShiftPlanFormData = z.infer<typeof shiftPlanValidationSchema>;
export type ShiftPlanEditData = z.infer<typeof shiftPlanEditSchema>;
export type ShiftAdjustmentFormData = z.infer<typeof shiftAdjustmentSchema>;

// Standard shift time definitions
export const STANDARD_SHIFTS = {
    morning: { start: '07:00', end: '15:00', crossesMidnight: false },
    evening: { start: '15:00', end: '23:00', crossesMidnight: false },
    night: { start: '23:00', end: '07:00', crossesMidnight: true },
} as const;
