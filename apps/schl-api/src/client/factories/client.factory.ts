import { UserSession } from 'src/common/types/user-session.type';
import { Client } from 'src/models/client.schema';
import { CreateClientBodyDto } from '../dto/create-client.dto';

export class ClientFactory {
    static fromCreateDto(
        dto: CreateClientBodyDto,
        session: UserSession,
    ): Partial<Client> {
        return {
            client_code: dto.client_code.trim(),
            client_name: dto.client_name.trim(),
            marketer: dto.marketer.trim(),
            contact_person: dto.contact_person.trim(),
            contact_number: dto.contact_number.trim(),
            email: dto.email.toLowerCase().trim(),
            designation: dto.designation.trim(),
            country: dto.country.trim(),
            address: dto.address.trim(),
            prices: dto.prices?.trim(),
            currency: dto.currency,
            vat_number: dto.vat_number?.trim(),
            tax_id: dto.tax_id?.trim(),
            category: dto.category?.trim(),
            last_invoice_number:
                dto.last_invoice_number == null
                    ? null
                    : dto.last_invoice_number,
            updated_by: session.db_id,
        } as Partial<Client>;
    }

    static fromUpdateDto(
        dto: Partial<CreateClientBodyDto>,
        session: UserSession,
    ): Partial<Client> {
        const patch: Partial<Client> = {};
        if (dto.client_code !== undefined)
            patch.client_code = dto.client_code.trim();
        if (dto.client_name !== undefined)
            patch.client_name = dto.client_name.trim();
        if (dto.marketer !== undefined) patch.marketer = dto.marketer.trim();
        if (dto.contact_person !== undefined)
            patch.contact_person = dto.contact_person.trim();
        if (dto.contact_number !== undefined)
            patch.contact_number = dto.contact_number.trim();
        if (dto.email !== undefined)
            patch.email = dto.email.toLowerCase().trim();
        if (dto.designation !== undefined)
            patch.designation = dto.designation.trim();
        if (dto.country !== undefined) patch.country = dto.country.trim();
        if (dto.address !== undefined) patch.address = dto.address.trim();
        if (dto.prices !== undefined) patch.prices = dto.prices?.trim();
        if (dto.currency !== undefined) patch.currency = dto.currency;
        if (dto.vat_number !== undefined)
            patch.vat_number = dto.vat_number?.trim();
        if (dto.tax_id !== undefined) patch.tax_id = dto.tax_id?.trim();
        if (dto.category !== undefined) patch.category = dto.category?.trim();
        if (dto.last_invoice_number !== undefined)
            patch.last_invoice_number =
                dto.last_invoice_number == null
                    ? null
                    : dto.last_invoice_number;
        patch.updated_by = session.db_id;
        return patch;
    }
}
