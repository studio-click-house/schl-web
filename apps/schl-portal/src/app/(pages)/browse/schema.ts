import {
    ORDER_PRIORITIES,
    ORDER_STATUSES,
    ORDER_TYPES,
} from '@repo/common/constants/order.constant';
import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
    client_code: z
        .string({ invalid_type_error: "Client code can't be empty" })
        .min(1, "Client code can't be empty"),
    client_name: z
        .string({ invalid_type_error: "Client name can't be empty" })
        .min(1, "Client name can't be empty"),
    folder: z.string().default(''),
    rate: z.coerce
        .number({ invalid_type_error: "Rate can't be empty" })
        .min(0, "Rate can't be negative")
        .nullable()
        .default(null),
    quantity: z.coerce
        .number({ invalid_type_error: "Quantity can't be empty" })
        .min(0, "Quantity can't be negative")
        .default(0),
    download_date: z.string({
        invalid_type_error: "Download date can't be empty",
    }),
    delivery_date: z.string().default(''),
    delivery_bd_time: z.string().default(''),
    task: z
        .string({ invalid_type_error: "Task can't be empty" })
        .min(1, "Task can't be empty"),
    et: z.coerce
        .number({ invalid_type_error: "ET can't be empty" })
        .min(0, "ET can't be less than 0")
        .default(0),
    production: z.coerce.number().default(0),
    qc1: z.coerce.number().default(0),
    qc2: z.coerce.number().default(0),
    comment: z.string().default(''),
    type: z.enum(ORDER_TYPES).default('general'),
    status: z.enum(ORDER_STATUSES).default('running'),
    folder_path: z.string().default(''),
    priority: z.enum(ORDER_PRIORITIES).default('medium'),
    updated_by: z.string().nullable().default(null),
    _id: z.optional(
        z.string().refine(val => {
            return mongoose.Types.ObjectId.isValid(val);
        }),
    ),
    createdAt: z.optional(z.union([z.date(), z.string()])),
    updatedAt: z.optional(z.union([z.date(), z.string()])),
    __v: z.optional(z.number()),
});

export type OrderDataType = z.infer<typeof validationSchema>;
