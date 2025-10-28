import { z } from 'zod';

export const validationSchema = z.object({
    username: z
        .string({ invalid_type_error: "Username can't be empty" })
        .min(1, "Username can't be empty"),
    password: z
        .string({ invalid_type_error: "Password can't be empty" })
        .min(1, "Password can't be empty"),
});

export type LoginDataType = z.infer<typeof validationSchema>;
