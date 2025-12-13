import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class TransferFileDto {
    @IsMongoId()
    @IsNotEmpty()
    orderId: string;

    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsMongoId()
    @IsNotEmpty()
    targetEmployeeId: string;
}
