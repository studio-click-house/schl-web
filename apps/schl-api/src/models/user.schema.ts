import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

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

    @Prop({ default: null })
    provided_name: string | null;

    @Prop({ required: [true, 'Password is required'] })
    password: string;

    @Prop({ required: [true, 'Role is required'] })
    role: string;

    @Prop({ default: '' })
    comment?: string;

    @Prop({ type: Date })
    readonly createdAt?: Date;

    @Prop({ type: Date })
    readonly updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
