import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class BulkDeactivateShiftPlansBodyDto {
    @IsArray()
    @IsMongoId({ each: true, message: 'Each ID must be a valid MongoDB ID' })
    ids: string[];

    @IsOptional()
    @IsString()
    comment?: string;
}
