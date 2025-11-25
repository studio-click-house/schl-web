import { IsNotEmpty, IsString } from 'class-validator';

export class RenameFileDto {
    @IsString()
    @IsNotEmpty()
    path: string;

    @IsString()
    @IsNotEmpty()
    oldName: string;

    @IsString()
    @IsNotEmpty()
    newName: string;
}
