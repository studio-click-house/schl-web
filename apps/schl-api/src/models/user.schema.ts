import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
})
export class User extends Document {
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
  provided_name: number;

  @Prop({ required: [true, 'Password is required'] })
  password: string;

  @Prop({ required: [true, 'Role is required'] })
  role: string;

  @Prop({ default: '' })
  comment: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
