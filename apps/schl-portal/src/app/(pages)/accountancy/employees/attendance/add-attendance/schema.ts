import {
    ATTENDANCE_STATUSES,
    VERIFY_MODES,
} from '@repo/common/constants/attendance.constant';
import mongoose from 'mongoose';
import { z } from 'zod';

export const validationSchema = z.object({
    employeeId: z.string().refine(mongoose.Types.ObjectId.isValid, {
        message: 'Invalid employee ID',
    }),
    userId: z.string().min(1, "User ID can't be empty"),
    inTime: z.string().min(1, 'In time is required'),
    inRemark: z.optional(z.string()).default(''),
    outTime: z.optional(z.string()).default(''),
    outRemark: z.optional(z.string()).default(''),
    verifyMode: z.enum(VERIFY_MODES),
    status: z.enum(ATTENDANCE_STATUSES),
});

export type AttendanceCreateData = z.infer<typeof validationSchema>;
