import {
    ArrayNotEmpty,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class MoveFileDto {
    @IsString()
    @IsNotEmpty()
    sourcePath: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    items: string[];

    @IsString()
    @IsNotEmpty()
    destPath: string;

    @IsOptional()
    @IsIn([0, 1, 2])
    mode?: 0 | 1 | 2;
}
