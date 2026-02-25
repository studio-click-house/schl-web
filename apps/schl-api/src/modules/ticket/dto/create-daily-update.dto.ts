import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateDailyUpdateBodyDto {
    @Transform(trimString)
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsNotEmpty()
    @IsMongoId()
    submittedBy: string;
}
