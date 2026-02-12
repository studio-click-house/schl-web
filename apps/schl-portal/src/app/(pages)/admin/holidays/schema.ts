import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

export const holidaySchema = z
    .object({
        name: z.string().min(1, 'Name is required'),
        dateFrom: z
            .string()
            .min(1, 'Start date is required')
            .regex(DATE_REGEX, 'Start date must be in YYYY-MM-DD format'),
        // Convert empty string to undefined so optional works properly for dateTo
        dateTo: z.preprocess(
            val => (val === '' ? undefined : val),
            z
                .string()
                .regex(DATE_REGEX, 'End date must be in YYYY-MM-DD format')
                .optional(),
        ),
        comment: z.string().max(500, 'Comment is too long').optional(),
    })
    .refine(
        data => {
            if (!data.dateTo) return true;
            return new Date(data.dateTo) >= new Date(data.dateFrom);
        },
        {
            message: 'End date must be the same or after Start date',
            path: ['dateTo'],
        },
    );

export type HolidayData = z.infer<typeof holidaySchema>;
