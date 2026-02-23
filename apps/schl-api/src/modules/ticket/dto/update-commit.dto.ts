import { emptyStringToUndefined } from '@repo/common/utils/transformers';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCommitBodyDto {
    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    message?: string;

    @Transform(emptyStringToUndefined)
    @IsOptional()
    @IsString()
    description?: string;
}
