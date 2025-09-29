import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client {
    @Prop({ required: [true, 'Client code is required'] })
    client_code: string; // unique code for the client, e.g. "0001_XX"

    @Prop({ required: [true, 'Client name is required'] })
    client_name: string; // client or company name

    @Prop({ required: [true, 'Marketer is required'] })
    marketer: string; // company provided name of the marketer (employee)

    @Prop({ required: [true, 'Contact person is required'] })
    contact_person: string;

    @Prop({ required: [true, 'Contact number is required'] })
    contact_number: string;

    @Prop({ required: [true, 'Email is required'] })
    email: string;

    @Prop({ required: [true, 'Designation is required'] })
    designation: string;

    @Prop({ required: [true, 'Country is required'] })
    country: string;

    @Prop({ required: [true, 'Address is required'] })
    address: string;

    @Prop({ default: '' })
    prices?: string; // price list or special prices for the client

    @Prop({
        default: '$',
        enum: ['$', '€', '£', 'A$', 'C$', 'NOK', 'DKK', 'SEK'],
    })
    currency: '$' | '€' | '£' | 'A$' | 'C$' | 'NOK' | 'DKK' | 'SEK';

    @Prop({ default: '' })
    vat_number: string;

    @Prop({ default: '' })
    tax_id: string;

    @Prop({ default: '' })
    category?: string; // client category, e.g. "Photographer", "Agency" etc.

    /*
    last invoice number for the client, for continuing the invoice number sequence for next invoice
    */
    @Prop({ default: null })
    last_invoice_number?: number | null;

    @Prop({ default: null })
    updated_by?: string | null;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
