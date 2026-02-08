import { z } from 'zod';

export const departmentSchema = z.object({
    name: z.string().min(1, 'Name is required').trim(),
    weekend_days: z
        .array(z.number().min(0).max(6))
        .min(1, 'At least one weekend day is required'),
    description: z.string().optional(),
});

export type DepartmentData = z.infer<typeof departmentSchema>;
