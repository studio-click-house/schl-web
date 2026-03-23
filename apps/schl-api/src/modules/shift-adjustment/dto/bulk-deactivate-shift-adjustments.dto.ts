import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkDeactivateShiftAdjustmentsBodyDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ message: 'IDs array cannot be empty' })
    ids: string[];

    @IsOptional()
    @IsString()
    comment?: string;
}
