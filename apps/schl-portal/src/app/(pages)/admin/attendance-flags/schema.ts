import { z } from 'zod';

export const attendanceFlagSchema = z.object({
    code: z.string().min(1, 'Code is required').max(5, 'Code too long'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, 'Invalid hex color'),
});

export type AttendanceFlagData = z.infer<typeof attendanceFlagSchema>;
