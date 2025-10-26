import { IsNotEmpty } from 'class-validator';

export class LoginBodyDto {
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    password: string;
}

export class LoginQueryDto {
    @IsNotEmpty()
    clientType: 'portal' | 'crm';
}
