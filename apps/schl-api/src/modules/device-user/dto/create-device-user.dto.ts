import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeviceUserBodyDto {
    /** Device user ID (from attendance device) */
    @IsString()
    @IsNotEmpty()
    userId: string;

    /** Card number or RFID (optional, must be unique if provided) */
    @IsString()
    @IsOptional()
    cardNumber?: string | null;

    /** Employee database ID (MongoDB ObjectId) */
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    employeeId: string;

    /** Optional comment */
    @IsString()
    @IsOptional()
    comment?: string;
}
