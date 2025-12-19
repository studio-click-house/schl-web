import mongoose from 'mongoose';
import { z } from 'zod';

const nonEmptyString = (
    fieldLabel: string,
    typeMessage?: string,
): z.ZodString =>
    z
        .string({
            invalid_type_error: typeMessage ?? `${fieldLabel} must be a string`,
            required_error: `${fieldLabel} can't be empty`,
        })
        .min(1, `${fieldLabel} can't be empty`);

const currencyEnum = z.enum(['$', '€', '£', 'A$', 'C$', 'NOK', 'DKK', 'SEK']);

export const validationSchema = z.object({
    client_code: nonEmptyString('Client code').regex(
        /^\d+_([A-Za-z]+([_-][A-Za-z]+)*)$/,
        'Client code must be in the format "0000_XX" or "0000_XX-YY"',
    ),
    client_name: nonEmptyString('Client name'),
    marketer: nonEmptyString('Marketer'),
    contact_person: nonEmptyString('Contact person'),
    contact_number: nonEmptyString('Contact number'),
    email: nonEmptyString('Email'),
    designation: nonEmptyString('Designation'),
    country: nonEmptyString('Country'),
    address: nonEmptyString('Address'),
    prices: z.string().default(''),
    currency: currencyEnum.default('$'),
    vat_number: z.string().default(''),
    tax_id: z.string().default(''),
    category: z.string().default(''),
    last_invoice_number: z
        .union([z.string(), z.null()])
        .optional()
        .default(null),
    updated_by: z.union([z.string(), z.null()]).optional().default(null),
    _id: z.optional(
        z.string().refine(val => mongoose.Types.ObjectId.isValid(val)),
    ),
    createdAt: z.optional(z.union([z.date(), z.string()])),
    updatedAt: z.optional(z.union([z.date(), z.string()])),
    __v: z.optional(z.number()),
});

export type ClientDataType = z.infer<typeof validationSchema>;
