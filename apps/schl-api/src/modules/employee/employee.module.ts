import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from 'src/models/employee.schema';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Employee.name, schema: EmployeeSchema },
        ]),
    ],
    controllers: [EmployeeController],
    providers: [EmployeeService],
})
export class EmployeeModule {}
