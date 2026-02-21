import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckUserDto {
    @IsString()
    @IsNotEmpty()
    username: string;
}

export class LoginTrackerDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsOptional()
    password?: string;
}

export class SetPasswordDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    password: string;
}
