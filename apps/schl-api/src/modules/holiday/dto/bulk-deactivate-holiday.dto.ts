import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkDeactivateHolidayBodyDto {
    @IsArray()
    @IsString({ each: true })
    ids: string[];

    @IsOptional()
    @IsString()
    comment?: string;
}
