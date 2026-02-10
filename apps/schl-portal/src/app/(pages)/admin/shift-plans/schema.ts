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
    changeReason: z.string().optional(),
});

// Schema for editing shift templates
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
    changeReason: z.string().optional(),
});

// Schema for single-day override
export const shiftOverrideSchema = z
    .object({
        employeeId: z.string().min(1, 'Employee is required'),
        shiftDate: z
            .string()
            .regex(
                /^\d{4}-\d{2}-\d{2}$/,
                'Shift date must be in YYYY-MM-DD format',
            ),
        overrideType: z.enum(['replace', 'cancel', 'off_day'], {
            errorMap: () => ({ message: 'Override type is required' }),
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
        changeReason: z.string().optional(),
    })
    .refine(
        data => {
            // For 'replace' overrides we require shift details; 'cancel' and 'off_day' do not require them
            if (data.overrideType === 'replace') {
                return Boolean(data.shiftType && data.shiftStart && data.shiftEnd);
            }
            return true;
        },
        {
            message:
                'Shift type, start time, and end time are required for replace overrides',
            path: ['shiftType'],
        },
    );

export type ShiftPlanFormData = z.infer<typeof shiftPlanValidationSchema>;
export type ShiftPlanEditData = z.infer<typeof shiftPlanEditSchema>;
export type ShiftOverrideFormData = z.infer<typeof shiftOverrideSchema>;

// Standard shift time definitions
export const STANDARD_SHIFTS = {
    morning: { start: '07:00', end: '15:00', crossesMidnight: false },
    evening: { start: '15:00', end: '23:00', crossesMidnight: false },
    night: { start: '23:00', end: '07:00', crossesMidnight: true },
} as const;
