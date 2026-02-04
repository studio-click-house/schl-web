import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
    user_id: z.string().min(1, "User ID can't be empty"),
    card_number: z.string().nullable().optional(),
    employee: z.string().refine(mongoose.Types.ObjectId.isValid, {
        message: 'Invalid employee ID',
    }),
    comment: z.optional(z.string()).default(''),
    _id: z.optional(
        z.string().refine(val => {
            return mongoose.Types.ObjectId.isValid(val);
        }),
    ),
    createdAt: z.optional(z.union([z.date(), z.string()])),
    updatedAt: z.optional(z.union([z.date(), z.string()])),
});

export type DeviceUserDataType = z.infer<typeof validationSchema>;
