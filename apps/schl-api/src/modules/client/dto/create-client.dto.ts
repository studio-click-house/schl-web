import {
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Validate,
} from 'class-validator';

import {
    CLIENT_CURRENCY,
    type ClientCurrency,
} from '@repo/common/constants/client.constant';
import { normalizeEmailListInput } from '@repo/common/utils/general-utils';
import { Transform, TransformFnParams } from 'class-transformer';
import { MultiEmailStringConstraint } from '../../../common/validators/multi-email-string.validator';

const transformEmailList = ({
    value,
}: TransformFnParams): string | undefined => {
    const normalized = normalizeEmailListInput(value);
    return typeof normalized === 'string' ? normalized : undefined;
};

export class CreateClientBodyDto {
    @IsString()
    @IsNotEmpty()
    clientCode: string;

    @IsString()
    @IsNotEmpty()
    clientName: string;

    @IsString()
    @IsNotEmpty()
    marketer: string;

    @IsString()
    @IsNotEmpty()
    contactPerson: string;

    @IsString()
    @IsNotEmpty()
    contactNumber: string;

    @IsString()
    @IsNotEmpty()
    @Transform(transformEmailList)
    @Validate(MultiEmailStringConstraint)
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

    @IsIn(CLIENT_CURRENCY as readonly ClientCurrency[])
    currency: ClientCurrency;

    @IsOptional()
    @IsString()
    vatNumber?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    lastInvoiceNumber?: string | null;
}
