import { z } from 'zod';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const holidayBaseSchema = z.object({
    name: z
        .string()
        .min(3, 'Name at least 3 characters long')
        .max(100, 'Name is too long'),
    dateFrom: z
        .string()
        .regex(DATE_REGEX, 'Invalid start date format (YYYY-MM-DD)'),
    dateTo: z
        .string()
        .regex(DATE_REGEX, 'Invalid end date format (YYYY-MM-DD)')
        .optional()
        .or(z.literal('')),
    comment: z.string().max(500, 'Comment is too long').optional(),
    active: z.boolean().optional(),
});

const validateDateRange = (data: { dateFrom: string; dateTo?: string }) => {
    if (!data.dateTo || data.dateTo === '') return true;
    return new Date(data.dateTo) >= new Date(data.dateFrom);
};

export const holidaySchema = holidayBaseSchema.refine(validateDateRange, {
    message: 'End date cannot be before start date',
    path: ['dateTo'],
});

export type HolidayData = z.infer<typeof holidaySchema>;

export const holidayAddSchema = holidayBaseSchema
    .extend({})
    .refine(validateDateRange, {
        message: 'End date cannot be before start date',
        path: ['dateTo'],
    });

export type HolidayAddData = z.infer<typeof holidayAddSchema>;
