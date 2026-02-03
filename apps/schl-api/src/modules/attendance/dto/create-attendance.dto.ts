import {
    ATTENDANCE_STATUSES,
    VERIFY_MODES,
    type AttendanceStatus,
    type VerifyMode,
} from '@repo/common/constants/attendance.constant';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceBodyDto {
    /** Employee ID reference */
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    /** Check-in time in ISO 8601 format */
    @IsString()
    @IsNotEmpty()
    inTime: string;

    /** Optional check-in remark */
    @IsOptional()
    @IsString()
    inRemark?: string;

    /** Check-out time in ISO 8601 format (optional for creating open sessions) */
    @IsOptional()
    @IsString()
    outTime?: string;

    /** Optional check-out remark */
    @IsOptional()
    @IsString()
    outRemark?: string;

    /** Device ID that recorded the attendance */
    @IsString()
    @IsNotEmpty()
    deviceId: string;

    /** User PIN/ID from the device */
    @IsString()
    @IsNotEmpty()
    userId: string;

    /** Verification mode (fingerprint, card, password, face, etc.) */
    @IsNotEmpty()
    @IsIn(VERIFY_MODES as readonly VerifyMode[])
    verifyMode: VerifyMode;

    /** Status/punch type (check-in, check-out, etc.) */
    @IsNotEmpty()
    @IsIn(ATTENDANCE_STATUSES as readonly AttendanceStatus[])
    status: AttendanceStatus;

    /** Source IP of the device */
    @IsString()
    @IsNotEmpty()
    sourceIp: string;
}
