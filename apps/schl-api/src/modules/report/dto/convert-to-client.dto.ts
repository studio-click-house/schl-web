import { IsMongoId, IsNotEmpty } from 'class-validator';
import { CreateClientBodyDto } from '../../client/dto/create-client.dto';

export class ConvertToClientBodyDto extends CreateClientBodyDto {
    @IsNotEmpty()
    @IsMongoId()
    reportId: string;
}
