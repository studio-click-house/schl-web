import {
    FILE_CONDITIONS,
    JOB_SELECTION_TYPES,
    JOB_SHIFTS,
} from '@repo/common/constants/order.constant';
import { z } from 'zod';

export const validationSchema = z.object({
    client_code: z
        .string({ required_error: "Client code can't be empty" })
        .min(1, "Client code can't be empty"),
    folder_path: z
        .string({ required_error: "Folder can't be empty" })
        .min(1, "Folder can't be empty"),
    file_names: z.array(z.string()).min(1, 'At least one file is required'),
    is_active: z.boolean().default(true), // start now or later
    qc_step: z.number().int().min(1).max(2).default(1),
    job_type: z.enum(JOB_SELECTION_TYPES, {
        required_error: 'Job type is required',
    }),
    shift: z.enum(JOB_SHIFTS, {
        required_error: 'Shift is required',
    }),
    file_condition: z.enum(FILE_CONDITIONS, {
        required_error: 'File condition is required',
    }),
});
export type NewJobDataType = z.infer<typeof validationSchema>;
