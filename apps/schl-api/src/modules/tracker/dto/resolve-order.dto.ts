import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveOrderDto {
    @IsNotEmpty()
    @IsString()
    folderPath: string;
}
