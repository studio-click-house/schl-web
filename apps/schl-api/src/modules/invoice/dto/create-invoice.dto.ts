import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

export class TimePeriodDto {
    @IsString()
    @IsNotEmpty()
    fromDate: string;

    @IsString()
    @IsNotEmpty()
    toDate: string;
}

// Body DTO for creating an invoice; maps to Invoice schema via factory
export class CreateInvoiceBodyDto {
    // Target client document id (used to update last_invoice_number)
    @IsString()
    @IsNotEmpty()
    clientId: string;

    // Invoice fields
    @IsString()
    @IsNotEmpty()
    clientCode: string;

    @IsString()
    @IsNotEmpty()
    createdBy: string;

    @ValidateNested()
    @Type(() => TimePeriodDto)
    timePeriod: TimePeriodDto;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    totalOrders?: number;

    @IsString()
    @IsNotEmpty()
    invoiceNumber: string;
}
