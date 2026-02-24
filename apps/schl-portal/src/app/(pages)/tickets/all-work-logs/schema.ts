import { z } from 'zod';

export const updateSchema = z.object({
    message: z.string().min(1, 'Commit message is required'),
    description: z.string().optional(),
});

export type UpdateCommitFormType = z.infer<typeof updateSchema>;
