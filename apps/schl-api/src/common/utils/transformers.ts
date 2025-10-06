// Shared transformers for class-transformer @Transform decorators

export function toBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1; // treat 1 as true, 0 as false
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
        if (['false', '0', 'no', 'n', 'off', ''].includes(v)) return false;
    }
    return defaultValue;
}

import type { TransformFnParams } from 'class-transformer';

export const booleanTransform = ({ value }: TransformFnParams): boolean =>
    toBoolean(value, false);
