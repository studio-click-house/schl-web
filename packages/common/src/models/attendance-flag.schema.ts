import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AttendanceFlagDocument = HydratedDocument<AttendanceFlag>;

@Schema({ timestamps: true, collection: 'attendance_flags' })
export class AttendanceFlag {
    @Prop({ required: true, unique: true, uppercase: true, trim: true })
    code: string; // e.g., "P", "L", "H", "E"

    @Prop({ required: true })
    name: string; // e.g., "Present", "Leave", "Holiday", "Extreme Delay"

    @Prop({ required: true })
    color: string; // Hex code, e.g., "#00FF00"

    @Prop({ required: false, type: String })
    description?: string;

    @Prop({ default: false })
    ignore_attendance_hours: boolean; // If true, working hours are 0 regardless of implementation (for Holidays/Weekends)

    @Prop({ default: false })
    is_payable: boolean; // Does this flag count as a paid day? (Holiday=Yes, Unpaid Leave=No)

    @Prop({ default: 0 })
    deduction_percent: number; // Percentage of salary to deduct (0 for paid, 100 for unpaid)
}

export const AttendanceFlagSchema =
    SchemaFactory.createForClass(AttendanceFlag);
