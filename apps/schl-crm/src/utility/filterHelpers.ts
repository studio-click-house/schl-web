import {
  Query as notice_Query,
  RegexFields as notice_RegexFields,
  RegexQuery as notice_RegexQuery,
} from '@/app/api/notice/route';
import {
  BooleanFields as report_BooleanFields,
  Query as report_Query,
  RegexFields as report_RegexFields,
  RegexQuery as report_RegexQuery,
} from '@/app/api/report/route';

type RegexQuery = report_RegexQuery | notice_RegexQuery;
type Query = report_Query | notice_Query;
type RegexFields = report_RegexFields | notice_RegexFields;
type BooleanFields = report_BooleanFields;

import { escapeRegExp } from 'lodash';

export const createFlexibleSearchPattern = (searchString: string): string => {
  // 1. Escape special regex characters
  const escaped = escapeRegExp(searchString);

  // 2. Create two patterns:
  // - One that matches the exact string with optional spaces
  // - One that matches the string without any spaces
  const withoutSpaces = escaped.replace(/\s+/g, '');
  const withFlexibleSpaces = escaped.replace(/\s+/g, '\\s*');

  // 3. Combine patterns with word boundaries
  const pattern = `\\b(${withoutSpaces}|${withFlexibleSpaces})\\b`;

  return pattern;
};

// Helper function to create a regex query
export const createRegexQuery = (
  value?: string,
  exactMatch: boolean = false,
): RegexQuery | undefined =>
  value
    ? {
        $regex: exactMatch
          ? `^${escapeRegExp(value.trim() || '')}$`
          : createFlexibleSearchPattern(value) || '',
        $options: 'i',
      }
    : undefined;

// Helper function to add boolean fields to the query
export const addBooleanField = (
  query: Query,
  key: BooleanFields,
  value?: boolean,
) => {
  if (value !== undefined) {
    (query as any)[key] = value;
  }
};

// Helper function to add regex fields to the query
export const addRegexField = (
  query: Query,
  key: RegexFields,
  value?: string,
  exactMatch: boolean = false,
) => {
  const regexQuery = createRegexQuery(value, exactMatch);
  if (regexQuery) {
    (query as any)[key] = regexQuery;
  }
};

// Helper function to add fields if they are defined

export const addIfDefined = <T extends Query>(
  query: T,
  key: keyof T,
  value: any,
) => {
  if (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    value !== false
  ) {
    query[key] = value;
  }
};
