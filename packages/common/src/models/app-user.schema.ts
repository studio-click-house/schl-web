import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppUserDocument = HydratedDocument<AppUser>;

@Schema({ timestamps: true })
export class AppUser {
    @Prop({
        type: String,
        required: [true, 'Username is required'],
        unique: true,
    })
    username: string;

    @Prop({ type: String, default: null })
    password: string | null;

    @Prop({ type: Boolean, default: false })
    isPasswordSet: boolean;

    @Prop({ type: String, default: 'Employee' })
    role: string;
}

export const AppUserSchema = SchemaFactory.createForClass(AppUser);
