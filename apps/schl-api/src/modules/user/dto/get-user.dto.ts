import { toBoolean } from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetUserQueryDto {
    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    expanded: boolean = false;
}
