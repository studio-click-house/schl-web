import { z } from 'zod';

export const holidaySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    date: z.string().min(1, 'Date is required'), // YYYY-MM-DD
});

export type HolidayData = z.infer<typeof holidaySchema>;
