import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
    timestamps: true,
})
export class User {
    @Prop({
        required: [true, 'Name is required'],
        unique: true,
    })
    name: string;

    @Prop({
        required: [true, 'Real name is required'],
    })
    real_name: string;

    @Prop({ type: String, default: null })
    provided_name?: string | null;

    @Prop({ required: [true, 'Password is required'] })
    password: string;

    @Prop({ required: [true, 'Role has not been assigned'], ref: 'Role' })
    role: mongoose.Types.ObjectId;

    @Prop({ default: '' })
    comment?: string;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
