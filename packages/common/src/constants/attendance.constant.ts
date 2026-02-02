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


/*
Technically, ZKTeco always sends "check-in" status for all attendance events,
but we define additional statuses here for potential future use and better clarity, or maybe just for fun :)
*/
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
