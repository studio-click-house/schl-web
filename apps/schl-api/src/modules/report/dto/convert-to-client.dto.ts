import { IsMongoId, IsOptional } from 'class-validator';
import { CreateClientBodyDto } from '../../client/dto/create-client.dto';

// Reuse the Client creation DTO shape for converting a report/company into a client
// and include the originating report id to avoid relying on company name matching.
export class ConvertToClientBodyDto extends CreateClientBodyDto {
    @IsOptional()
    @IsMongoId()
    reportId?: string;
}
