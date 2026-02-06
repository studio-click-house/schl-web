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
] as const;
export type VerifyMode = (typeof VERIFY_MODES)[number];
export const verifyModeOptions = VERIFY_MODES.map(mode => ({
    label: mode.charAt(0).toUpperCase() + mode.slice(1), // Capitalize first letter
    value: mode,
}));

/*
In practice, ZKTeco always sends "check-in" status for all attendance events, So there's no point in having other statuses
Check-in and Check-out are handled in API
*/
export const ATTENDANCE_STATUSES = ['check-in'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const attendanceStatusOptions = ATTENDANCE_STATUSES.map(status => ({
    label: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
    value: status,
}));

// Used when device_id is missing or unknown (manual/admin entries)
export const DEFAULT_DEVICE_ID = 'SYZ8250800377';

// Used when source_ip is missing or unknown (manual/admin entries)
export const DEFAULT_SOURCE_IP = '::ffff:192.168.10.69';
