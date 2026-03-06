import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchFileDto {
    @IsString()
    @IsNotEmpty()
    query: string;

    @IsString()
    @IsOptional()
    clientCode?: string;
}
