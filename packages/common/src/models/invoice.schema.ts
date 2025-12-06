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
    total_orders: number;

    @Prop({ required: [true, 'Invoice number is required'] })
    invoice_number: string;

    @Prop({ type: Date })
    readonly createdAt: Date;

    @Prop({ type: Date })
    readonly updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes to improve queries filtering by client and time range
// Queries often filter by client_code and time_period boundaries, so a
// compound index helps the database perform these lookups quickly.
InvoiceSchema.index({
    client_code: 1,
    'time_period.fromDate': 1,
    'time_period.toDate': 1,
});

// For queries that filter only by start or to-date, a single-field index
// on 'time_period.fromDate' can also help but the compound index above
// should be sufficient for most cases.
InvoiceSchema.index({ 'time_period.fromDate': 1 });
