# @repo/common

This package contains shared schemas, types, and utilities for the schl-web monorepo.

## Schemas

- `approval.schema` - Approval request schemas
- `client.schema` - Client data schemas
- `employee.schema` - Employee data schemas
- `invoice.schema` - Invoice schemas
- `notice.schema` - Notice schemas
- `order.schema` - Order schemas
- `report.schema` - Report schemas
- `role.schema` - Role schemas
- `schedule.schema` - Schedule schemas
- `user.schema` - User schemas

## Utilities

### Date Helpers (`utils/date-helpers`)

- `getTodayDate()` - Get today's date in YYYY-MM-DD format
- `getDateRange(daysAgo)` - Get date range for last N days
- `applyDateRange(query, field, fromDate, toDate)` - Apply date range filter to MongoDB query
- `calculateTimeDifference(deliveryDate, deliveryBdTime)` - Calculate time difference in minutes
- `YYYY_MM_DD_to_DD_MM_YY(dateString)` - Convert date format
- `ISO_to_DD_MM_YY(isoDate)` - Convert ISO date to DD-MM-YYYY
- `getTodayDate_DD_MM_YYYY()` - Get today's date in DD-MM-YYYY format
- `formatTime(time24)` - Format 24-hour time to 12-hour format
- `formatDate(dateString)` - Format date with "Do MMM. 'YY" format
- `formatTimestamp(timestamp)` - Format timestamp with date and time
- `toISODate(dateStr, hours, minutes, seconds, milliseconds)` - Convert to ISO date
- `getDatesInRange(fromTime, toTime)` - Get array of dates in range
- `getLast12Months()` - Get last 12 months data
- `getMonthRange(monthAndYear)` - Get start and end dates for month
- `getDaysSince(date)` - Get days since given date
- `daysToYMD(days)` - Convert days to years, months, days

### General Utils (`utils/general-utils`)

- `cn(...inputs)` - Combine class names with Tailwind CSS
- `fetchApi(target, options, authToken)` - API fetch utility
- `copy(text)` - Copy text to clipboard
- `escapeRegex(text)` - Escape regex special characters
- `generatePassword(inputString, digits)` - Generate password
- `isEmployeePermanent(joiningDate)` - Check employee permanent status
- `sha256(message)` - Generate SHA-256 hash
- `generateAvatar(text)` - Generate Gravatar avatar URL
- `delay(ms)` - Create delay promise
- `verifyCookie(token, id)` - Verify JWT cookie
- `getInlinePages(current, total)` - Get pagination page numbers
- `incrementInvoiceNumber(invoiceNumber)` - Increment invoice number
- `constructFileName(file_name, notice_no)` - Construct file name with notice number

### Select Helpers (`utils/select-helpers`)

- `setCalculatedZIndex(baseZIndex)` - Set z-index for select components
- `setClassNameAndIsDisabled(isOpen, isDisabled, className)` - Set select class and disabled state
- `setMenuPortalTarget` - Menu portal target for select

### Changes Generate (`utils/changes-generate`)

- `getObjectChanges(oldObj, newObj)` - Compare objects and get changes
- `Change` type - Type for change objects

### Other Utilities

- `account-helpers` - Account-related utilities
- `filter-helpers` - Filtering utilities
- `permission-check` - Permission checking utilities
- `transformers` - Data transformation utilities

## Usage

```typescript
import { fetchApi } from '@repo/common/utils/general-utils';
import { YYYY_MM_DD_to_DD_MM_YY } from '@repo/common/utils/date-helpers';
```
