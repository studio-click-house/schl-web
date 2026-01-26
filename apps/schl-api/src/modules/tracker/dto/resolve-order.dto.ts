import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveOrderDto {
    @IsNotEmpty()
    @IsString()
    clientCode: string;

    @IsNotEmpty()
    @IsString()
    folder: string;
}
