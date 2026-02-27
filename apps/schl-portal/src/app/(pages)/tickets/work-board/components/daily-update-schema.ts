import mongoose from 'mongoose';
import { z } from 'zod';

export const dailyUpdateSchema = z.object({
    message: z
        .string({ invalid_type_error: 'Message must be a string' })
        .min(1, 'Message is required'),
    ticket: z
        .string()
        .optional()
        .refine(
            val => !val || mongoose.Types.ObjectId.isValid(val),
            'Invalid ticket id',
        ),
});

export type DailyUpdateFormData = z.infer<typeof dailyUpdateSchema>;
