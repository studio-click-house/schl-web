import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type HolidayDocument = HydratedDocument<Holiday>;

@Schema({ timestamps: true })
export class Holiday {
    @Prop({ required: true })
    name: string; // e.g., "Eid-ul-Fitr"

    @Prop({ required: true, type: Date })
    date: Date; // The specific date

    @Prop({
        required: true,
        ref: 'AttendanceFlag',
        type: mongoose.Schema.Types.ObjectId,
    })
    flag: mongoose.Types.ObjectId; // E.g., The 'H' flag

    @Prop({ type: Boolean, default: true })
    recurring: boolean; // Does this happen every year? (Complex to handle lunar calendars, but good for simple ones)
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);
