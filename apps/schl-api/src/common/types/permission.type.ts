import { USER_PERMISSIONS } from 'src/common/constants/permission.constant';
export type Permissions = (typeof USER_PERMISSIONS)[number]['value'];
