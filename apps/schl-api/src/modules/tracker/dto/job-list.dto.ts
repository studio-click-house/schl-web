import { IsOptional, IsString } from 'class-validator';

export class JobListDto {
    // Optional filter to only return jobs for one client
    @IsString()
    @IsOptional()
    clientCode?: string;
}
