import { Employee } from 'src/models/employee.schema';

/**
 * Structure representing the decomposed salary components.
 */
export interface SalaryStructureType {
    base: number;
    houseRent: number;
    convAllowance: number;
    grossSalary: number;
}

/** Quick numeric parsing with fallback */
const toInt = (v: string): number => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : NaN;
};

/**
 * Compute the whole number of months between a YYYY-MM-(DD|ignored) date string and now.
 * Returns 0 for invalid input or future dates gracefully (never negative).
 */
export const getMonthsTillNow = (dateString: string | null): number => {
    if (!dateString) return 0;
    // Expect at least YYYY-MM
    const parts = dateString.split('-');
    if (parts.length < 2) return 0;
    const year = toInt(parts[0]);
    const monthIndex = toInt(parts[1]) - 1; // 0-based month
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return 0;
    if (monthIndex < 0 || monthIndex > 11) return 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const totalMonths = (currentYear - year) * 12 + (currentMonth - monthIndex);
    return totalMonths < 0 ? 0 : totalMonths; // no negative accumulation
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
 * Calculate the provident fund money saved so far for an employee.
 * Logic: sum all historical saved_amount slices + amount accrued since last history (or start date).
 */
export const getPFMoneyAmount = (
    salaryComponents: SalaryStructureType,
    employeeData: Employee,
): number => {
    const history = employeeData.pf_history || [];
    const pfPercent = employeeData.provident_fund || 0;
    const baseSalary = salaryComponents.base; // already int

    if (pfPercent <= 0 || baseSalary <= 0) {
        // Nothing accumulates without positive PF% & base
        return 0;
    }

    if (history.length === 0) {
        // Accrue from start date directly
        const months = getMonthsTillNow(employeeData.pf_start_date || null);
        return Math.round((baseSalary * pfPercent * months) / 100);
    }

    // Sum previous slices
    let cumulative = 0;
    for (let i = 0; i < history.length; i++) {
        cumulative += history[i].saved_amount;
    }

    // Add accrual since last recorded date (using current pfPercent)
    const last = history[history.length - 1];
    const monthsSince = getMonthsTillNow(last.date);
    if (monthsSince > 0) {
        cumulative += Math.round((baseSalary * pfPercent * monthsSince) / 100);
    }
    return cumulative;
};
