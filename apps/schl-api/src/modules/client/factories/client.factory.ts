import { Client } from '@repo/common/models/client.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateClientBodyDto } from '../dto/create-client.dto';

export class ClientFactory {
    static fromCreateDto(
        dto: CreateClientBodyDto,
        session: UserSession,
    ): Partial<Client> {
        return {
            client_code: dto.clientCode.trim(),
            client_name: dto.clientName.trim(),
            marketer: dto.marketer.trim(),
            contact_person: dto.contactPerson.trim(),
            contact_number: dto.contactNumber.trim(),
            email: dto.email.toLowerCase().trim(),
            designation: dto.designation.trim(),
            country: dto.country.trim(),
            address: dto.address.trim(),
            prices: dto.prices?.trim(),
            currency: dto.currency,
            vat_number: dto.vatNumber?.trim(),
            tax_id: dto.taxId?.trim(),
            category: dto.category?.trim(),
            last_invoice_number:
                dto.lastInvoiceNumber == null ? null : dto.lastInvoiceNumber,
            updated_by: session.real_name,
        } as Partial<Client>;
    }

    static fromUpdateDto(
        dto: Partial<CreateClientBodyDto>,
        session: UserSession,
    ): Partial<Client> {
        const patch: Partial<Client> = {};
        if (dto.clientCode !== undefined)
            patch.client_code = dto.clientCode.trim();
        if (dto.clientName !== undefined)
            patch.client_name = dto.clientName.trim();
        if (dto.marketer !== undefined) patch.marketer = dto.marketer.trim();
        if (dto.contactPerson !== undefined)
            patch.contact_person = dto.contactPerson.trim();
        if (dto.contactNumber !== undefined)
            patch.contact_number = dto.contactNumber.trim();
        if (dto.email !== undefined)
            patch.email = dto.email.toLowerCase().trim();
        if (dto.designation !== undefined)
            patch.designation = dto.designation.trim();
        if (dto.country !== undefined) patch.country = dto.country.trim();
        if (dto.address !== undefined) patch.address = dto.address.trim();
        if (dto.prices !== undefined) patch.prices = dto.prices?.trim();
        if (dto.currency !== undefined) patch.currency = dto.currency;
        if (dto.vatNumber !== undefined)
            patch.vat_number = dto.vatNumber?.trim();
        if (dto.taxId !== undefined) patch.tax_id = dto.taxId?.trim();
        if (dto.category !== undefined) patch.category = dto.category?.trim();
        if (dto.lastInvoiceNumber !== undefined)
            patch.last_invoice_number =
                dto.lastInvoiceNumber == null ? null : dto.lastInvoiceNumber;
        patch.updated_by = session.real_name;
        return patch;
    }
}
