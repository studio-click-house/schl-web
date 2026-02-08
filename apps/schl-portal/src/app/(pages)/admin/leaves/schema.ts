import { z } from 'zod';

export const leaveSchema = z.object({
    employeeId: z.string().min(1, 'Employee is required'),
    flagId: z.string().min(1, 'Leave Type is required'),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
    reason: z.string().min(1, 'Reason is required'),
});

export type LeaveData = z.infer<typeof leaveSchema>;
