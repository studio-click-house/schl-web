import { LEAVE_TYPES } from '@repo/common/constants/leave.constant';
import { z } from 'zod';

export const leaveSchema = z.object({
    employeeId: z.string().min(1, 'Employee is required'),
    leaveType: z.enum(LEAVE_TYPES as any),
    isPaid: z.boolean(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
    reason: z.string().min(1, 'Reason is required'),
});

export type LeaveData = z.infer<typeof leaveSchema>;
