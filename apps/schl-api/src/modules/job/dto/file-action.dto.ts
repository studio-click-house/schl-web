import { Transform, TransformFnParams } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class FileActionDto {
    @IsMongoId()
    @IsNotEmpty()
    orderId: string;

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }: TransformFnParams): string | undefined =>
        typeof value === 'string' ? value.trim() : undefined,
    )
    fileName: string;
}
