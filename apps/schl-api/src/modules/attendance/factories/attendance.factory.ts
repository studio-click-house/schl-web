import { Attendance } from '@repo/common/models/attendance.schema';
import { MarkEmployeeDto } from '../dto/mark-employee.dto';

export class AttendanceFactory {
    static fromMarkDto(dto: MarkEmployeeDto): Partial<Attendance> {
        return {
            timestamp: dto.timestamp,
            device_id: dto.deviceId,
            user_id: dto.userId,
            verify_mode: dto.verifyMode,
            status: dto.status,
            source_ip: dto.sourceIp,
            received_at: dto.receivedAt,
        } as Partial<Attendance>;
    }
}
