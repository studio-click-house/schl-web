import { toBoolean } from '@repo/common/utils/transformers';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

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
    company: string;

    @IsString()
    contactPerson: string;

    @IsOptional()
    @IsString()
    contactNumber?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    status?: string;

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
    prospecting?: boolean;

    @IsOptional()
    @IsString()
    prospectingStatus?: string;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    newLead?: boolean;

    @IsOptional()
    @IsString()
    leadOrigin?: string | null;

    @IsOptional()
    @Type(() => String)
    @Transform(({ value }) => toBoolean(value, false))
    @IsBoolean()
    testJob?: boolean;
}
