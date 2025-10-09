import { IsNotEmpty } from 'class-validator';

export class ChangePasswordBodyDto {
    @IsNotEmpty()
    old_password: string;

    @IsNotEmpty()
    new_password: string;
}
