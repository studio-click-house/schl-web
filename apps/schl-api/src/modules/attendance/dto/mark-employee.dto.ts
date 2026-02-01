import {
    ATTENDANCE_STATUSES,
    type AttendanceStatus,
    VERIFY_MODES,
    type VerifyMode,
} from '@repo/common/constants/attendance.constant';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MarkEmployeeDto {
    /** Device serial number or identifier */
    @IsString()
    @IsNotEmpty()
    deviceId: string;

    /** User PIN/ID from the device */
    @IsString()
    @IsNotEmpty()
    userId: string;

    /** Parsed timestamp in ISO 8601 format */
    @IsString()
    @IsNotEmpty()
    timestamp: string;

    /** Original timestamp string from device */
    @IsString()
    @IsOptional()
    rawTimestamp?: string;

    /** Verification mode (fingerprint, card, password, face, etc.) */
    @IsNotEmpty()
    @IsIn(VERIFY_MODES as readonly VerifyMode[])
    verifyMode: VerifyMode;

    /** Status/punch type (check-in, check-out, etc.) */
    @IsNotEmpty()
    @IsIn(ATTENDANCE_STATUSES as readonly AttendanceStatus[])
    status: AttendanceStatus;

    /** Complete raw payload for debugging */
    @IsString()
    @IsOptional()
    rawPayload?: string;

    /** Source IP of the device */
    @IsString()
    @IsNotEmpty()
    sourceIp: string;

    /** Reception timestamp */
    @IsString()
    @IsNotEmpty()
    receivedAt: string;
}
