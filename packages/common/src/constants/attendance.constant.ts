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
] as const;
export type VerifyMode = (typeof VERIFY_MODES)[number];

export const ATTENDANCE_STATUSES = [
    'check-in',
    'check-out',
    'break-out',
    'break-in',
    'overtime-in',
    'overtime-out',
    'unspecified',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
