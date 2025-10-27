import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
  emails: z.string().regex(/^\S+$/, 'Email must not contain any whitespace'),
});

export type ValidationInputType = z.infer<typeof validationSchema>;
