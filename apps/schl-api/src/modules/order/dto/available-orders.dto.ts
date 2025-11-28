import { IsOptional, IsString } from 'class-validator';

export class ClientCodeQueryDto {
    @IsOptional()
    @IsString()
    code?: string;
}

export class OrderTypeQueryDto {
    @IsString()
    orderType:
        | 'General'
        | 'Test'
        | 'QC - General'
        | 'QC - Test'
        | 'Correction - General'
        | 'Correction - Test';
}
