import mongoose from 'mongoose';
import { z } from 'zod';

export const dailyUpdateSchema = z.object({
    message: z
        .string({ invalid_type_error: 'Message must be a string' })
        .min(1, 'Message is required'),
ticket: z
  .string()
  .refine(val => mongoose.Types.ObjectId.isValid(val), 'Invalid ticket id')
  .nullable()
  .optional(),
});

export type DailyReportFormData = z.infer<typeof dailyUpdateSchema>;
