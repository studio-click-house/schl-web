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
In practice, ZKTeco always sends "check-in" status for all attendance events, So there's no point in having other statuses
Check-in and Check-out are handled in API
*/
export const ATTENDANCE_STATUSES = ['check-in'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
