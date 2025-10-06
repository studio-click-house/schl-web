import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateRoleBodyDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    permissions: string[];
}
