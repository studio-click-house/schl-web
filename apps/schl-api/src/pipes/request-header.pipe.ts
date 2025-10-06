import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

type DtoConstructor<T extends object> = new () => T;

export const RequestHeader = createParamDecorator(
    async <T extends object>(
        targetDto: DtoConstructor<T>,
        ctx: ExecutionContext,
    ): Promise<T> => {
        const headers = ctx.switchToHttp().getRequest().headers;
        const dto = plainToInstance(targetDto, headers, {
            excludeExtraneousValues: true,
        });
        await validateOrReject(dto);
        return dto;
    },
);
