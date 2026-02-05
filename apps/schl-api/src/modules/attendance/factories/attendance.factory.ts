import { Attendance } from '@repo/common/models/attendance.schema';
import * as moment from 'moment-timezone';
import { CreateAttendanceBodyDto } from '../dto/create-attendance.dto';
import { MarkAttendanceDto } from '../dto/mark-attendance.dto';

export class AttendanceFactory {
    static fromMarkDto(
        dto: MarkAttendanceDto,
        inTime: Date,
    ): Partial<Attendance> {
        return {
            in_time: inTime,
            device_id: dto.deviceId.trim(),
            user_id: dto.userId.trim(),
            verify_mode: dto.verifyMode.trim(),
            status: dto.status.trim(),
            source_ip: dto.sourceIp.trim(),
            received_at:
                moment.tz(dto.receivedAt, 'Asia/Dhaka').toDate() || null,
        } as Partial<Attendance>;
    }

    static fromCreateDto(dto: CreateAttendanceBodyDto): Partial<Attendance> {
        return {
            in_time: moment.tz(dto.inTime, 'Asia/Dhaka').toDate(),
            in_remark: dto.inRemark?.trim() || '',
            out_time: dto.outTime
                ? moment.tz(dto.outTime, 'Asia/Dhaka').toDate()
                : null,
            out_remark: dto.outRemark?.trim() || '',
            device_id: dto.deviceId.trim(),
            user_id: dto.userId.trim(),
            verify_mode: dto.verifyMode,
            status: dto.status,
            source_ip: dto.sourceIp.trim(),
            received_at: moment.tz('Asia/Dhaka').toDate(), // server receive time
        } as Partial<Attendance>;
    }

    static fromUpdateDto(
        dto: Partial<CreateAttendanceBodyDto>,
    ): Partial<Attendance> {
        const patch: Partial<Attendance> = {};

        if (dto.inTime !== undefined)
            patch.in_time = moment.tz(dto.inTime, 'Asia/Dhaka').toDate();
        if (dto.inRemark !== undefined)
            patch.in_remark = dto.inRemark?.trim() || '';
        if (dto.outTime !== undefined)
            patch.out_time = dto.outTime
                ? moment.tz(dto.outTime, 'Asia/Dhaka').toDate()
                : null;
        if (dto.outRemark !== undefined)
            patch.out_remark = dto.outRemark?.trim() || '';
        if (dto.verifyMode !== undefined) patch.verify_mode = dto.verifyMode;
        if (dto.status !== undefined) patch.status = dto.status;

        return patch;
    }
}
