import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type HolidayDocument = HydratedDocument<Holiday>;

@Schema({ timestamps: true })
export class Holiday {
    @Prop({ required: true })
    name: string; // e.g., "Eid-ul-Fitr"

    @Prop({ required: true, type: Date })
    dateFrom: Date; // Start date of the holiday (inclusive)

    @Prop({ required: true, type: Date })
    dateTo: Date; // End date of the holiday (inclusive). Same as dateFrom for single-day holidays.

    @Prop({ type: String })
    comment?: string; // Optional note or description for the holiday

    @Prop({
        required: true,
        ref: 'attendance_flags',
        type: mongoose.Schema.Types.ObjectId,
    })
    flag: mongoose.Types.ObjectId; // E.g., The 'H' flag
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);
