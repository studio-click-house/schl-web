import { USER_PERMISSIONS } from '../constants/permission.constant';
import type { Permissions } from '../types/permission.type';

// Pre-compute a Set of valid permission string values for O(1) membership checks
const VALID_PERMISSION_VALUES = new Set<string>(
    USER_PERMISSIONS.map(p => p.value),
);

/**
 * Check whether a user has a specific permission.
 */
export const hasPerm = (
    perm: Permissions,
    userPermissions: Permissions[],
): boolean => {
    if (!perm) return false;
    if (!Array.isArray(userPermissions) || userPermissions.length === 0)
        return false;
    return userPermissions.includes(perm);
};

/**
 * Check whether a user has at least one of the provided permissions.
 */
export const hasAnyPerm = (
    perms: Permissions[],
    userPermissions: Permissions[],
): boolean => {
    if (!Array.isArray(perms) || perms.length === 0) return false;
    if (!Array.isArray(userPermissions) || userPermissions.length === 0)
        return false;
    const userSet = new Set(userPermissions);
    return perms.some(p => userSet.has(p));
};

/**
 * Convert an arbitrary string array into a strongly typed Permissions[] by
 * filtering out any values not present in the canonical permissions list.
 */
export const toPermissions = (perms: string[]): Permissions[] => {
    if (!Array.isArray(perms) || perms.length === 0) return [];
    return perms.filter((p): p is Permissions =>
        VALID_PERMISSION_VALUES.has(p),
    );
};

/**
 * Normalize an unknown permissions collection into a strongly typed `Permissions[]`
 * - Accepts unknown / mixed input
 * - Filters out non-string entries
 * - Uses shared `toPermissions` utility for canonical validation
 */

export const sanitizePermissions = (perms: unknown): Permissions[] => {
    if (!Array.isArray(perms)) return [];
    const stringPerms = perms.filter((p): p is string => typeof p === 'string');
    return toPermissions(stringPerms);
};
