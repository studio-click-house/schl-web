import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ timestamps: true })
export class Invoice {
    @Prop({ required: [true, 'Client code is required'] })
    client_code: string;

    @Prop({ required: [true, 'Created by is required'] })
    created_by: string;

    @Prop({
        required: [true, 'Time period is required'],
        type: {
            fromDate: { type: String, required: true },
            toDate: { type: String, required: true },
        },
    })
    time_period: { fromDate: string; toDate: string };

    @Prop({ default: 0 })
    total_orders?: number;

    @Prop({ required: [true, 'Invoice number is required'] })
    invoice_number: string;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
