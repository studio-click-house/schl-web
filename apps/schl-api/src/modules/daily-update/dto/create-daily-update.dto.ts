import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateDailyUpdateBodyDto {
    @Transform(trimString)
    @IsString()
    @IsNotEmpty()
    message: string;

    // optional ticket reference (ObjectId)
    @IsOptional()
    @IsMongoId()
    ticket?: string;
}
