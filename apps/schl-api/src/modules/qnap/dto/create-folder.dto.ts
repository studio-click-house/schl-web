import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFolderDto {
    @IsString()
    @IsNotEmpty()
    path: string;

    @IsString()
    @IsNotEmpty()
    name: string;
}
