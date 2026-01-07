import { IsNotEmpty, IsString } from 'class-validator';

export class MarkDuplicateClientRequestBodyDto {
    @IsString()
    @IsNotEmpty()
    clientCode: string;
}
