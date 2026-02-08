/**
 * Format OT minutes to HH:MM format
 */
export function formatOT(otMinutes: number | null | undefined): string {
    if (!otMinutes || otMinutes < 0) return '0:00';
    const hours = Math.floor(otMinutes / 60);
    const mins = otMinutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert OT minutes to decimal hours
 */
export function getOTInHours(otMinutes: number | null | undefined): number {
    if (!otMinutes || otMinutes < 0) return 0;
    return Math.round((otMinutes / 60) * 100) / 100;
}
