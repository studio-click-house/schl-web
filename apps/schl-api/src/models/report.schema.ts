import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
    @Prop({ required: [true, 'Marketer id is required'] })
    marketer_id: string;

    @Prop({ required: [true, 'Marketer name is required'] })
    marketer_name: string;

    @Prop({ required: [true, 'Calling date is required'] })
    calling_date: string;

    @Prop({ default: '' })
    followup_date?: string;

    @Prop({ required: [true, 'Country name is required'] })
    country: string;

    @Prop({ required: [true, 'Designation is required'] })
    designation: string;

    @Prop({
        required: [true, 'Website link is required'],
        validate: {
            validator: function (v: string) {
                return /^(http|https):\/\/[^ "]+$/.test(v);
            },
            message: (props: any) =>
                `${(props.value as string).trim()} is not a valid website link!`,
        },
    })
    website: string;

    @Prop({ required: [true, 'Category is required'], minlength: 1 })
    category: string;

    @Prop({ required: [true, 'Company name is required'], minlength: 3 })
    company_name: string;

    @Prop({ required: [true, 'Contact person name is required'], minlength: 3 })
    contact_person: string;

    @Prop({ default: '' })
    contact_number?: string;

    @Prop({ default: '' })
    email_address?: string;

    @Prop({ default: '' })
    calling_status?: string;

    @Prop({ default: '' })
    linkedin?: string;

    @Prop({ type: [String], default: [] })
    calling_date_history?: string[];

    @Prop({ default: null })
    updated_by?: string | null;

    @Prop({ default: false })
    followup_done?: boolean;

    @Prop({ default: false })
    is_prospected?: boolean;

    @Prop({ default: '' })
    prospect_status?: string;

    @Prop({ default: false })
    is_lead?: boolean;

    @Prop({ enum: ['none', 'pending', 'approved'], default: 'none' })
    client_status?: 'none' | 'pending' | 'approved';

    @Prop({ default: false })
    lead_withdrawn?: boolean;

    @Prop({ type: [String], default: [] })
    test_given_date_history?: string[];

    @Prop({ default: '' })
    onboard_date?: string;

    @Prop({ default: null })
    lead_origin?: string | null; // null for non-lead reports, string ("generated" | <marketer name>) for lead reports

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
