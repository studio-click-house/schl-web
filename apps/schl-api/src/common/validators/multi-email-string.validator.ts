import {
    normalizeEmailListInput,
    splitEmailList,
} from '@repo/common/utils/general-utils';
import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    isEmail,
} from 'class-validator';

@ValidatorConstraint({ name: 'multiEmailString', async: false })
export class MultiEmailStringConstraint
    implements ValidatorConstraintInterface
{
    validate(value: unknown): boolean {
        const normalized = normalizeEmailListInput(value);
        if (normalized === undefined) return true;

        const emails = splitEmailList(normalized);
        if (!emails.length) return true;

        const allValid = emails.every(email => isEmail(email));
        return Boolean(allValid);
    }

    defaultMessage(): string {
        return 'Each email must be valid and separated by " / "';
    }
}
