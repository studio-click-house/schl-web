import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class FileActionDto {
    @IsMongoId()
    @IsNotEmpty()
    orderId: string;

    @IsString()
    @IsNotEmpty()
    fileName: string;
}
