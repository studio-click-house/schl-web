import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TICKET_TYPES,
} from '@repo/common/constants/ticket.constant';
import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
    title: z.string().min(1, 'Ticket title is required'),
    description: z.string().min(1, 'Ticket description is required'),
    type: z.enum(TICKET_TYPES, {
        required_error: 'Ticket type is required',
    }),
    status: z.enum(TICKET_STATUSES).default('new'),
    priority: z.enum(TICKET_PRIORITIES).default('low'),
    _id: z.optional(
        z.string().refine(val => {
            return mongoose.Types.ObjectId.isValid(val);
        }),
    ),
    createdAt: z.optional(z.union([z.date(), z.string()])),
    updatedAt: z.optional(z.union([z.date(), z.string()])),
    __v: z.optional(z.number()),
});

export type TicketFormDataType = z.infer<typeof validationSchema>;
