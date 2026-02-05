import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';
import {
    EMPLOYEE_DEPARTMENTS,
    type EmployeeDepartment,
} from '../constants/employee.constant';
import { WEEK_DAYS, type WeekDay } from '../constants/shift.constant';

export type DepartmentConfigDocument = HydratedDocument<DepartmentConfig>;

/**
 * Department Configuration Schema
 * Stores department-specific settings like weekend days.
 * Weekend days are considered holidays - work on these days counts as overtime.
 */
@Schema({ timestamps: true })
export class DepartmentConfig {
    @Prop({
        required: [true, 'Department is required'],
        type: String,
        enum: EMPLOYEE_DEPARTMENTS,
        unique: true,
        index: true,
    })
    department: EmployeeDepartment;

    /**
     * Days of the week that are considered weekends/holidays for this department.
     * Work on these days automatically counts as overtime.
     * Default: ['saturday', 'sunday'] for most departments
     */
    @Prop({
        required: true,
        type: [String],
        enum: WEEK_DAYS,
        default: ['saturday', 'sunday'],
    })
    weekend_days: WeekDay[];

    @Prop({
        required: false,
        ref: 'User',
        type: mongoose.Types.ObjectId,
    })
    updated_by: mongoose.Types.ObjectId;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const DepartmentConfigSchema =
    SchemaFactory.createForClass(DepartmentConfig);

// Index for quick lookup by department
DepartmentConfigSchema.index({ department: 1 }, { unique: true });
