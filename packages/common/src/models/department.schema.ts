import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema({ timestamps: true })
export class Department {
    @Prop({ required: true, unique: true, index: true, trim: true })
    name: string; // "Marketing", "HR", etc. Matches employee.department string.

    @Prop({ type: [Number], default: [0] }) // 0=Sunday, 1=Monday... 6=Saturday
    weekend_days: number[];

    @Prop({ default: '' })
    description: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
