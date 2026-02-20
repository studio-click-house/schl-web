import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    TICKET_TYPES,
} from '@repo/common/constants/ticket.constant';
import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
    ticketId: z
        .string()
        .refine(
            val => mongoose.Types.ObjectId.isValid(val),
            'Ticket is required',
        ),

    sha: z.string().optional(),
    message: z.string().min(1, 'Commit message is required'),
    description: z.string().optional(),

    type: z.enum(TICKET_TYPES).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
});

export type WorkLogFormType = z.infer<typeof validationSchema>;
