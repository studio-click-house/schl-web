import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceUserDocument = HydratedDocument<DeviceUser>;

@Schema({ timestamps: true, collection: 'device_users' })
export class DeviceUser {
    // Always present in ATTLOG
    @Prop({ required: true, unique: true, index: true })
    user_id: string;

    // Optional credential
    @Prop({
        required: false,
        unique: true,
        sparse: true,
        index: true,
        default: null,
    })
    card_number?: string | null;

    // Single source of truth reference
    @Prop({
        required: true,
        ref: 'Employee',
        type: mongoose.Schema.Types.ObjectId,
        index: true,
    })
    employee: mongoose.Types.ObjectId;

    @Prop({ required: false, type: String, default: '' })
    comment: string;

    @Prop()
    readonly createdAt: Date;

    @Prop()
    readonly updatedAt: Date;
}

export const DeviceUserSchema = SchemaFactory.createForClass(DeviceUser);
