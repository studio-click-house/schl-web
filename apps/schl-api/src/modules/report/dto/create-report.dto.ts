import {
    CLIENT_STATUSES,
    type ClientStatus,
} from '@repo/common/constants/report.constant';
import { normalizeEmailListInput } from '@repo/common/utils/general-utils';
import { toBoolean } from '@repo/common/utils/transformers';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    Validate,
} from 'class-validator';
import { MultiEmailStringConstraint } from '../../../common/validators/multi-email-string.validator';

const transformEmailList = ({
    value,
}: TransformFnParams): string | undefined => {
    const normalized = normalizeEmailListInput(value);
    return typeof normalized === 'string' ? normalized : undefined;
};

export class CreateReportBodyDto {
    @IsString()
    callingDate: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    followupDate?: string; // YYYY-MM-DD or ''

    @IsString()
    country: string;

    @IsString()
    designation: string;

    @IsString()
    website: string;

    @IsString()
    category: string;

    @IsString()
    companyName: string;

    @IsString()
    contactPerson: string;

    @IsOptional()
    @IsString()
    contactNumber?: string;

    @IsOptional()
    @Transform(transformEmailList)
    @Validate(MultiEmailStringConstraint)
    emailAddress?: string;

    @IsOptional()
    @IsString()
    callingStatus?: string;

    @IsOptional()
    @IsString()
    linkedin?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    followupDone?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    isProspected?: boolean;

    @IsOptional()
    @IsString()
    prospectStatus?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    isLead?: boolean;

    @IsOptional()
    @IsString()
    leadOrigin?: string | null;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    testJob?: boolean;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    recall?: boolean;

    @IsString()
    @IsIn(CLIENT_STATUSES)
    clientStatus: ClientStatus;

    @IsOptional()
    @IsString()
    orderUpdate?: string;

    @IsOptional()
    @IsString()
    clientCode?: string | null;
}
