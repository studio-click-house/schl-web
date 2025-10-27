import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    init as initZeroBounce,
    zeroBounce,
} from '@repo/schemas/lib/zero-bounce/index';

@Injectable()
export class ValidatorService {
    constructor(private readonly configService: ConfigService) {
        initZeroBounce(
            this.configService.get<string>('ZERO_BOUNCE_API_KEY') || '',
        );
    }

    async validateSingleEmail(email: string) {
        try {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                throw new BadRequestException('Invalid email format');
            }

            // Implement the logic to validate a single email using ZeroBounce
            const validation = await zeroBounce.validateEmail(email);

            if (!validation) {
                throw new InternalServerErrorException(
                    'No validation result returned',
                );
            }

            const validationData = {
                address: validation.address,
                status: validation.status,
                sub_status: validation.sub_status,
                domain: validation.domain,
                free_email:
                    String(validation.free_email).toLowerCase() === 'true',
                mx_found: String(validation.mx_found).toLowerCase() === 'true',
                mx_record: validation.mx_record ?? null,
                smtp_provider: validation.smtp_provider ?? null,
                domain_age_days: validation.domain_age_days
                    ? Number(validation.domain_age_days)
                    : null,
                did_you_mean: validation.did_you_mean ?? null,
                firstname: validation.firstname ?? null,
                lastname: validation.lastname ?? null,
                gender: validation.gender ?? null,
                country: validation.country ?? null,
                region: validation.region ?? null,
                city: validation.city ?? null,
                zipcode: validation.zipcode ?? null,
                processed_at: validation.processed_at
                    ? validation.processed_at
                    : null,
            };

            return validationData;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new BadRequestException('Error validating email');
        }
    }

    async validateBulkEmail(emails: string[]) {
        try {
            // Prepare email list for ZeroBounce API
            const emailObjectList = emails.map((email: string) => ({
                email_address: email,
            }));

            const validations = await zeroBounce.validateBatch(emailObjectList);

            if (
                !validations.email_batch ||
                validations.email_batch.length === 0
            ) {
                throw new InternalServerErrorException(
                    'Failed to validate emails',
                );
            }

            const validationData = validations.email_batch.map(
                (validation: any) => ({
                    address: validation.address,
                    status: validation.status,
                    sub_status: validation.sub_status,
                    domain: validation.domain,
                    free_email:
                        String(validation.free_email).toLowerCase() === 'true',
                    mx_found:
                        String(validation.mx_found).toLowerCase() === 'true',
                    mx_record: validation.mx_record ?? null,
                    smtp_provider: validation.smtp_provider ?? null,
                    domain_age_days: validation.domain_age_days
                        ? Number(validation.domain_age_days)
                        : null,
                    did_you_mean: validation.did_you_mean ?? null,
                    firstname: validation.firstname ?? null,
                    lastname: validation.lastname ?? null,
                    gender: validation.gender ?? null,
                    country: validation.country ?? null,
                    region: validation.region ?? null,
                    city: validation.city ?? null,
                    zipcode: validation.zipcode ?? null,
                    processed_at: validation.processed_at
                        ? validation.processed_at
                        : null,
                }),
            );

            return validationData;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new BadRequestException('Error validating emails');
        }
    }
}
