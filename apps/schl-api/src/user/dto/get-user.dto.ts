import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toBoolean } from 'src/common/utils/transformers';

export class GetUserQueryDto {
    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    expanded: boolean = false;
}
