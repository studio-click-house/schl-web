/**
 * Shared filter helper utilities for building flexible MongoDB regex-based search queries.
 */
// Lightweight escapeRegExp to avoid external dependency
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface RegexQuery {
    $regex: string;
    $options: string;
}

/**
 * Create a pattern that tolerates flexible whitespace and also matches the compact form.
 * Example: "Color Correction" => matches "Color   Correction" or "ColorCorrection".
 */
export const createFlexibleSearchPattern = (input: string): string => {
    const trimmed = input.trim();
    const escaped = escapeRegExp(trimmed);
    const flexibleSpaces = escaped.replace(/\s+/g, '\\s*');
    const compact = escaped.replace(/\s+/g, '');
    return `(?<![A-Za-z])(${compact}|${flexibleSpaces})`;
};

export interface CreateRegexOptions {
    exact?: boolean; // wraps with ^...$ and trims
    flexible?: boolean; // allow whitespace flexibility + compact variant
    caseInsensitive?: boolean; // default true
}

/**
 * Build a RegexQuery or return undefined if value is empty.
 */
export const createRegexQuery = (
    value?: string,
    opts: CreateRegexOptions = {},
): RegexQuery | undefined => {
    if (!value || !value.trim()) return undefined;
    const { exact = false, flexible = true, caseInsensitive = true } = opts;
    let pattern: string;
    if (exact) {
        pattern = `^\\s*${escapeRegExp(value.trim())}\\s*$`;
    } else if (flexible) {
        pattern = createFlexibleSearchPattern(value);
    } else {
        pattern = escapeRegExp(value.trim());
    }
    return { $regex: pattern, $options: caseInsensitive ? 'i' : '' };
};

/** Add key/value if value is not nullish / empty / false. */
export const addIfDefined = <
    T extends Record<string, unknown>,
    K extends keyof T,
>(
    target: T,
    key: K,
    value: unknown,
) => {
    if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== false
    ) {
        target[key] = value as T[K];
    }
};

/**
 * Build an $or array for a general search string across multiple field names.
 */
export const buildOrRegex = (
    term: string,
    fields: string[],
    opts: CreateRegexOptions = {},
): Record<string, RegexQuery>[] => {
    const rq = createRegexQuery(term, opts);
    if (!rq) return [];
    return fields.map(f => ({ [f]: rq }) as Record<string, RegexQuery>);
};

/**
 * Add plus-separated token matching: each token must appear as a token (split by '+').
 * Generates a single RegexQuery and assigns it to key if value valid.
 * Uses positive lookaheads to ensure all tokens are present.
 *
 * Note: MongoDB does not support lookbehinds, so we only ensure the token is not preceded by a letter.
 */
export const addPlusSeparatedContainsAllField = <
    T extends Record<string, unknown>,
>(
    query: T,
    key: keyof T,
    value?: string,
) => {
    if (!value || !value.trim()) return;
    const tokens = value
        .split('+')
        .map(t => t.trim())
        .filter(Boolean);
    if (tokens.length === 0) return;
    const lookaheads = tokens.map(t => {
        const escaped = escapeRegExp(t).replace(/\s+/g, '\\s*');
        return `(?=.*(?:^|\\s*\\+\\s*)${escaped}(?:\\s*\\+\\s*|$))`;
    });
    const pattern = `^${lookaheads.join('')}.*$`;
    (query as Record<string, unknown>)[key as string] = {
        $regex: pattern,
        $options: 'i',
    };
};

/**
 * Convenience to add a boolean field only if true.
 */
export const addBooleanField = <
    T extends Record<string, unknown>,
    K extends keyof T,
>(
    query: T,
    key: K,
    value?: boolean,
) => {
    if (value === true) query[key] = value as T[K];
};
