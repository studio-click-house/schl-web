import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class DeleteFileDto {
    @IsString()
    @IsNotEmpty()
    path: string;

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    items: string[];

    @IsOptional()
    @IsBoolean()
    force?: boolean;
}
