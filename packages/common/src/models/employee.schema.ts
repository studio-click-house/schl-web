import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
    EmployeeBloodGroup,
    EmployeeStatus,
} from '../constants/employee.constant';
import {
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_STATUSES,
} from '../constants/employee.constant';

export type EmployeeDocument = HydratedDocument<Employee>;

export type { ProvidentFundHistory, StatusHistory };

@Schema({ _id: false })
class ProvidentFundHistory {
    @Prop({ required: [true, 'PF: Date is required'] })
    date: string; // an update of provident_fund/gross was made in this date.

    @Prop({ required: [true, 'PF: Gross salary is required'] })
    gross: number; // previous gross salary (if changed).

    @Prop({ required: [true, 'PF: Provident fund percentage is required'] })
    provident_fund: number; // previous pf percentage (if changed).

    /*
    total saved pf money from previous object's(of this pf_history array) `date` value, if no previous object then use `pf_start_date` field's value to this object's (of this pf_history array) `date` value. (use previous pf percentage and gross salary to calculate)
    */
    @Prop({ required: [true, 'PF: Saved amount is required'] })
    saved_amount: number;

    @Prop({ required: [true, 'PF: Note is required'] })
    note: string; // what got changed. Ex. Value: "Gross salary was updated."
}

@Schema({ _id: false })
class StatusHistory {
    @Prop({ required: [true, 'Status: Date is required'] })
    date: string; // YYYY-MM-DD format, date when status changed

    @Prop({
        required: [true, 'Status: From status is required'],
        enum: EMPLOYEE_STATUSES,
    })
    from_status: EmployeeStatus; // previous status

    @Prop({
        required: [true, 'Status: To status is required'],
        enum: EMPLOYEE_STATUSES,
    })
    to_status: EmployeeStatus; // new status

    @Prop({ default: '' })
    note: string; // reason for change (e.g., "Medical leave", "End of sabbatical")
}

@Schema({ timestamps: true })
export class Employee {
    @Prop({
        required: [true, 'Employee ID is required'],
        unique: true,
        index: true,
    })
    e_id: string;

    @Prop({ required: [true, 'Real name is required'] })
    real_name: string;

    @Prop({ required: [true, 'Joining date is required'] })
    joining_date: string;

    @Prop({ default: '' })
    phone: string;

    @Prop({ default: '' })
    email: string;

    @Prop({ default: '' })
    birth_date: string;

    @Prop({ default: '' })
    nid: string;

    @Prop({
        default: '',
        enum: EMPLOYEE_BLOOD_GROUPS,
    })
    blood_group: EmployeeBloodGroup;

    @Prop({ required: [true, 'Designation is required'] })
    designation: string;

    @Prop({ required: [true, 'Department is required'] })
    department: string;

    @Prop({ required: [true, 'Gross salary is required'] })
    gross_salary: number;

    @Prop({ required: [true, 'Bonus (eid-ul-adha) is required'] })
    bonus_eid_ul_adha: number;

    @Prop({ required: [true, 'Bonus (eid-ul-fitr) is required'] })
    bonus_eid_ul_fitr: number;

    @Prop({
        required: [true, 'Status is required'],
        enum: EMPLOYEE_STATUSES,
    })
    status: EmployeeStatus;

    @Prop({ default: 0 })
    provident_fund: number; // percentage

    @Prop({ type: String, default: null })
    pf_start_date: string | null; // provident fund start date

    @Prop({ type: [ProvidentFundHistory], default: [] })
    pf_history: ProvidentFundHistory[];

    @Prop({ type: [StatusHistory], default: [] })
    status_history: StatusHistory[]; // tracks all status changes with timestamps

    @Prop({ default: '' })
    branch: string;

    @Prop({ default: '' })
    address: string;

    @Prop({ default: '' })
    division: string;

    /*
    if the employee is a marketer, company usually provides a name for him/her (e.g. "John" instead of "Jabbar")
    */
    @Prop({ type: String, default: null })
    company_provided_name: string | null;

    @Prop({ default: '' })
    note: string;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
