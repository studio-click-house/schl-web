import {
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class CreateUserBodyDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    real_name: string;

    @IsOptional()
    @IsString()
    provided_name?: string | null;

    @IsString()
    @MinLength(6)
    password: string;

    @IsMongoId()
    role: string; // role id

    @IsOptional()
    @IsString()
    comment?: string;
}
