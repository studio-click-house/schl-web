export const VERIFY_MODES = [
    'fingerprint',
    'finger',
    'template',
    'biometric',
    'face',
    'facedata',
    'photo',
    'image',
    'palm',
    'iris',
    'password',
    'card',
    'manual',
    'auto',
] as const;
export type VerifyMode = (typeof VERIFY_MODES)[number];
export const verifyModeOptions = VERIFY_MODES.map(mode => ({
    label: mode.charAt(0).toUpperCase() + mode.slice(1), // Capitalize first letter
    value: mode,
}));

/*
In practice, ZKTeco devices send "check-in" for events and the API handles check-in/check-out logic.
We add a secondary status, `system-generated`, to mark auto-generated records (for leaves, holidays, weekends, absent auto-fill) so they are clearly identifiable in reports and audits.
*/
export const ATTENDANCE_STATUSES = ['check-in', 'system-generated'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const attendanceStatusOptions = ATTENDANCE_STATUSES.map(status => ({
    label: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
    value: status,
}));

// Used when device_id is missing or unknown (manual/admin entries)
export const DEFAULT_DEVICE_ID = 'SYZ8250800377';

// Used when source_ip is missing or unknown (manual/admin entries)
export const DEFAULT_SOURCE_IP = '::ffff:192.168.10.69';
