import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type Permissions } from '../types/permission.type';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
    @Prop({ required: [true, 'Name is required'] })
    name: string;
    @Prop({ default: '' })
    description: string;
    @Prop({
        type: [String],
        minLength: [1, 'At least one permission is required'],
    })
    permissions: Permissions[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
