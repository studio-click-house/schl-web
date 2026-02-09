import { Employee } from '../models/employee.schema';

/**
 * Structure representing the decomposed salary components.
 */
export interface SalaryStructureType {
    base: number;
    houseRent: number;
    convAllowance: number;
    grossSalary: number;
}

// Statuses where PF SHOULD accrue (on-leave continues to accrue PF)
const EARNING_STATUSES = ['active', 'on-leave'] as const;

/** Quick numeric parsing with fallback */
const toInt = (v: string): number => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : NaN;
};

/**
 * Parse YYYY-MM-DD string to Date object.
 * Returns null if invalid format.
 */
const parseDate = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length < 3) return null;
    const year = toInt(parts[0]);
    const month = toInt(parts[1]);
    const day = toInt(parts[2]);
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
};

/**
 * Calculate months between two dates.
 * Returns 0 if either date is invalid or if endDate is before startDate.
 */
const getMonthsBetween = (startDate: Date, endDate: Date): number => {
    if (endDate < startDate) return 0;
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return years * 12 + months;
};

/**
 * Compute the whole number of months between a YYYY-MM-DD date string and now.
 * Returns 0 for invalid input or future dates gracefully (never negative).
 */
export const getMonthsTillNow = (dateString: string | null): number => {
    if (!dateString) return 0;
    const date = parseDate(dateString);
    if (!date) return 0;
    const now = new Date();
    const months = getMonthsBetween(date, now);
    return months < 0 ? 0 : months;
};

/**
 * Break gross salary into base, house rent and conveyance allowance.
 * Uses fixed 68% base rule; remainder split evenly.
 */
export const calculateSalaryComponents = (
    grossSalary: number,
): SalaryStructureType => {
    const basePct = 68;
    const base = Math.trunc((grossSalary * basePct) / 100);
    const remainderHalf = Math.trunc((grossSalary * (100 - basePct)) / 100 / 2);
    return {
        base,
        houseRent: remainderHalf,
        convAllowance: remainderHalf,
        grossSalary,
    };
};

/**
 * Check if an employee status allows PF accrual.
 */
const isEarningStatus = (status: string): boolean => {
    return (EARNING_STATUSES as readonly string[]).includes(status);
};

/**
 * Calculate the provident fund money saved so far for an employee, accounting for status changes.
 * Logic:
 * 1. Sum all historical saved_amount slices from pf_history
 * 2. Build timeline from status_history to identify earning vs non-earning periods
 * 3. Add accrual only for earning periods since last pf_history entry
 * 4. Do NOT accrue for non-earning periods (inactive, fired, terminated, resigned, retired)
 */
export const getPFMoneyAmount = (
    salaryComponents: SalaryStructureType,
    employeeData: Employee,
): number => {
    const history = employeeData.pf_history || [];
    const statusHistory = employeeData.status_history || [];
    const pfPercent = employeeData.provident_fund || 0;
    const baseSalary = salaryComponents.base; // already int

    if (pfPercent <= 0 || baseSalary <= 0) {
        // Nothing accumulates without positive PF% & base
        return 0;
    }

    // Check if employee is currently in non-earning status
    const currentStatus = employeeData.status;
    if (!isEarningStatus(currentStatus)) {
        // Employee is not currently earning, only return historical PF
        let cumulative = 0;
        for (let i = 0; i < history.length; i++) {
            cumulative += history[i].saved_amount;
        }
        return cumulative;
    }

    // Sum previous slices
    let cumulative = 0;
    for (let i = 0; i < history.length; i++) {
        cumulative += history[i].saved_amount;
    }

    // Determine the start date for new accrual calculation
    let accrualStartDate: Date;
    if (history.length === 0) {
        // No history, start from pf_start_date
        const pfStartDate = parseDate(employeeData.pf_start_date || null);
        if (!pfStartDate) return 0;
        accrualStartDate = pfStartDate;
    } else {
        // Start from last history date
        const lastHistoryDate = parseDate(history[history.length - 1].date);
        if (!lastHistoryDate) return cumulative; // Can't compute further
        accrualStartDate = lastHistoryDate;
    }

    // Build earning periods since accrualStartDate
    const now = new Date();
    let totalEarningMonths = 0;

    // Sort status history by date
    const sortedStatusHistory = [...statusHistory].sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    });

    // Assume employee started in earning status (at joining_date)
    let wasEarning = true;
    let periodStartDate = accrualStartDate;

    // Process each status change
    for (const statusChange of sortedStatusHistory) {
        const changeDate = parseDate(statusChange.date);
        if (!changeDate || changeDate < accrualStartDate) {
            continue; // Ignore status changes before our accrual period
        }

        // If this change is in the future, ignore it
        if (changeDate > now) {
            break;
        }

        // Add earning months if we were in earning status before this change
        if (wasEarning) {
            totalEarningMonths += getMonthsBetween(periodStartDate, changeDate);
        }

        // Update for next iteration
        wasEarning = isEarningStatus(statusChange.to_status);
        periodStartDate = changeDate;
    }

    // Add remaining period from last status change (or accrualStartDate) to now
    if (wasEarning) {
        totalEarningMonths += getMonthsBetween(periodStartDate, now);
    }

    // Calculate and add new accrual
    const newAccrual = Math.round(
        (baseSalary * pfPercent * totalEarningMonths) / 100,
    );
    cumulative += newAccrual;

    return cumulative;
};
