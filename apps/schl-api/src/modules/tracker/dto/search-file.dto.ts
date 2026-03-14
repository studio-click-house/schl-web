import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class SearchFileDto {
    @IsString()
    @IsNotEmpty()
    query: string;

    @IsString()
    @IsOptional()
    clientCode?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    days?: number;
}
