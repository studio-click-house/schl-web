import {
    SHIFT_ADJUSTMENT_TYPES,
    SHIFT_TYPES,
} from '@repo/common/constants/shift.constant';
import { z } from 'zod';

// Base object schema
const baseShiftAdjustmentSchema = z.object({
    employeeIds: z
        .array(z.string())
        .min(1, 'At least one employee is required'),
    shiftDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Shift date must be in YYYY-MM-DD format')
        .refine(
            date => {
                const selectedDate = new Date(date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return selectedDate >= today;
            },
            {
                message: 'Shift date cannot be before today',
            },
        ),
    adjustmentType: z.enum(SHIFT_ADJUSTMENT_TYPES, {
        errorMap: () => ({ message: 'Adjustment type is required' }),
    }),
    shiftType: z.enum(SHIFT_TYPES).optional(),
    shiftStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Shift start time must be in HH:mm format')
        .optional(),
    shiftEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Shift end time must be in HH:mm format')
        .optional(),
    gracePeriodMinutes: z.coerce.number().int().min(0).max(120).default(10),
    active: z.boolean().optional(),
    comment: z.string().optional(),
});

export const shiftAdjustmentSchema = baseShiftAdjustmentSchema.refine(
    data => {
        // For 'replace' adjustments we require shift details; 'cancel' and 'off_day' do not require them
        if (data.adjustmentType === 'replace') {
            return Boolean(data.shiftType && data.shiftStart && data.shiftEnd);
        }
        return true;
    },
    {
        message:
            'Shift type, start time, and end time are required for replace adjustments',
        path: ['shiftType'],
    },
);

export type ShiftAdjustmentFormData = z.infer<typeof shiftAdjustmentSchema>;

export const shiftAdjustmentEditSchema = baseShiftAdjustmentSchema
    .omit({ employeeIds: true })
    .refine(
        data => {
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

export type ShiftAdjustmentEditData = z.infer<typeof shiftAdjustmentEditSchema>;
