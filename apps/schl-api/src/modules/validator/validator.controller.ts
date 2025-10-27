import {
    Controller,
    Get,
    HttpException,
    InternalServerErrorException,
    Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    init as initZeroBounce,
    zeroBounce,
} from '@repo/schemas/lib/zero-bounce/index';
import { BulkEmailParamDto } from './dto/bulk-email.dto';
import { SingleEmailParamDto } from './dto/single-email.dto';
import { ValidatorService } from './validator.service';

@Controller('validator')
export class ValidatorController {
    constructor(
        private readonly validatorService: ValidatorService,
        private readonly configService: ConfigService,
    ) {
        initZeroBounce(
            this.configService.get<string>('ZERO_BOUNCE_API_KEY') || '',
        );
    }

    @Get('check-credit')
    async checkCredit() {
        try {
            const creditInfo = await zeroBounce.getCredits();
            if (creditInfo === null || creditInfo === undefined) {
                throw new InternalServerErrorException(
                    'No credit info returned',
                );
            }
            return { credit: creditInfo };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Error checking credit');
        }
    }

    @Get('single-email/:email')
    validateSingleEmail(@Param() { email }: SingleEmailParamDto) {
        return this.validatorService.validateSingleEmail(email);
    }

    @Get('bulk-email/:emails')
    validateBulkEmail(@Param() { emails }: BulkEmailParamDto) {
        return this.validatorService.validateBulkEmail(emails);
    }
}
