import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

const CURRENCIES = ['$', '€', '£', 'A$', 'C$', 'NOK', 'DKK', 'SEK'] as const;
type Currency = (typeof CURRENCIES)[number];

export class CreateClientBodyDto {
    @IsString()
    @IsNotEmpty()
    client_code: string;

    @IsString()
    @IsNotEmpty()
    client_name: string;

    @IsString()
    @IsNotEmpty()
    marketer: string;

    @IsString()
    @IsNotEmpty()
    contact_person: string;

    @IsString()
    @IsNotEmpty()
    contact_number: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    designation: string;

    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsOptional()
    @IsString()
    prices?: string;

    @IsIn(CURRENCIES)
    currency: Currency;

    @IsOptional()
    @IsString()
    vat_number?: string;

    @IsOptional()
    @IsString()
    tax_id?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    last_invoice_number?: number | null;
}
