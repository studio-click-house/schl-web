import { Order } from '@repo/common/models/order.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateOrderBodyDto } from '../dto/create-order.dto';

export class OrderFactory {
    static fromCreateDto(
        dto: CreateOrderBodyDto,
        session: UserSession,
    ): Partial<Order> {
        return {
            client_code: dto.clientCode.trim(),
            client_name: dto.clientName.trim(),
            folder: dto.folder?.trim(),
            rate: dto.rate ?? null,
            quantity: dto.quantity ?? 0,
            download_date: dto.downloadDate,
            delivery_date: dto.deliveryDate ?? '',
            delivery_bd_time: dto.deliveryBdTime ?? '',
            task: dto.task.trim(),
            et: dto.et ?? 0,
            production: dto.production ?? 0,
            qc1: dto.qc1 ?? 0,
            qc2: dto.qc2 ?? 0,
            comment: dto.comment ?? '',
            type: dto.type ?? 'general',
            status: dto.status ?? 'running',
            folder_path: dto.folderPath ?? '',
            priority: dto.priority ?? 'medium',
            updated_by: session.real_name,
        };
    }

    static fromUpdateDto(
        dto: Partial<CreateOrderBodyDto>,
        session: UserSession,
    ): Record<string, any> {
        const doc: Record<string, any> = { updated_by: session.real_name };

        if (dto.clientCode !== undefined)
            doc.client_code = dto.clientCode.trim();
        if (dto.clientName !== undefined)
            doc.client_name = dto.clientName.trim();
        if (dto.folder !== undefined) doc.folder = dto.folder;
        if (dto.rate !== undefined) doc.rate = dto.rate;
        if (dto.quantity !== undefined) doc.quantity = dto.quantity;
        if (dto.downloadDate !== undefined)
            doc.download_date = dto.downloadDate;
        if (dto.deliveryDate !== undefined)
            doc.delivery_date = dto.deliveryDate;
        if (dto.deliveryBdTime !== undefined)
            doc.delivery_bd_time = dto.deliveryBdTime;
        if (dto.task !== undefined) doc.task = dto.task;
        if (dto.et !== undefined) doc.et = dto.et;
        if (dto.production !== undefined) doc.production = dto.production;
        if (dto.qc1 !== undefined) doc.qc1 = dto.qc1;
        if (dto.qc2 !== undefined) doc.qc2 = dto.qc2;
        if (dto.comment !== undefined) doc.comment = dto.comment;
        if (dto.type !== undefined) doc.type = dto.type;
        if (dto.status !== undefined) doc.status = dto.status;
        if (dto.folderPath !== undefined) doc.folder_path = dto.folderPath;
        if (dto.priority !== undefined) doc.priority = dto.priority;

        return doc;
    }
}
