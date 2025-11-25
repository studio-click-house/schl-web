export const QNAP_DIR = ['ASC', 'DESC'] as const;
export type QnapDir = (typeof QNAP_DIR)[number];

export const QNAP_SORT_FIELDS = [
    'filename',
    'filesize',
    'filetype',
    'mt',
    'privilege',
    'owner',
    'group',
];
export type QnapSortField = (typeof QNAP_SORT_FIELDS)[number];

export const QNAP_ERROR_MAP: Record<number, string> = {
    0: 'Operation failed (Unknown Error)',
    1: 'Success',
    2: 'File or folder already exists',
    3: 'Authentication Failure (Session expired)',
    4: 'Permission denied',
    5: 'File or folder not found',
    6: 'File extracting',
    7: 'File IO Error',
    8: 'Web File Manager is not enabled',
    9: 'Disk quota exceeded',
    10: 'Source permission denied',
    11: 'Destination permission denied',
    12: 'Illegal file name',
    13: 'Exceed ISO maximum',
    14: 'Exceed Share maximum',
    15: 'Login fail',
    16: 'Recycle bin disabled',
    17: 'Authentication failed / Password incorrect',
    18: 'Account locked / Media Library disabled',
    19: 'System busy (DB Fail)',
    20: 'Invalid parameter',
    22: 'Transcoding in progress',
    23: 'Source volume error',
    24: 'Destination volume error',
    25: 'Destination file not exist / Locked',
    26: 'File name too long',
    27: 'Folder encrypted',
    33: 'Duplicate name',
    37: 'WebDAV mount limit exceeded',
    61: 'File size too large',
    63: 'Delete file failed',
    101: 'Invalid parameter',
    102: 'Missing parameter',
};
