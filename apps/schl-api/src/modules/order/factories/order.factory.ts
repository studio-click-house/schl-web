import { Order } from '@repo/common/models/order.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import mongoose from 'mongoose';
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { FilesTrackingDto, ProgressDto } from '../dto/create-order.dto';
import { CreateOrderBodyDto } from '../dto/create-order.dto';

// NOTE: We intentionally use explicit any-casts for DTO fields here to avoid linting
// errors from @typescript-eslint/no-unsafe-argument when transforming inputs returned
// from the controller. These fields are validated at controller-level DTOs.

export class OrderFactory {
    private static toMaybeDate = (
        v?: string | Date | number | null,
    ): Date | null => {
        if (v === undefined || v === null) return null;
        if (v instanceof Date) return v;
        return new Date(String(v));
    };

    private static toMaybeObjectId = (
        id?: string | mongoose.Types.ObjectId | null,
    ): mongoose.Types.ObjectId | null => {
        if (id === undefined || id === null) return null;
        return new mongoose.Types.ObjectId(String(id));
    };
    static fromCreateDto(
        dto: CreateOrderBodyDto,
        session: UserSession,
    ): Partial<Order> {
        // NOTE: We intentionally use explicit any-casts for DTO fields here to avoid linting
        // errors from @typescript-eslint/no-unsafe-argument when transforming inputs returned
        // from the controller. These fields are validated at controller-level DTOs.
        const toDate = OrderFactory.toMaybeDate;
        const toObjectId = OrderFactory.toMaybeObjectId;
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
            progress: dto.progress
                ? dto.progress.map((p: ProgressDto) => ({
                      employee: toObjectId(String(p.employee)) as any,
                      shift: p.shift,
                      category: p.category ?? 'production',
                      is_qc: p.is_qc ?? false,
                      qc_step: p.qc_step ?? null,
                      files_tracking: (p.files_tracking || []).map(
                          (ft: FilesTrackingDto) => ({
                              file_name: ft.file_name,

                              start_timestamp:
                                  toDate(ft.start_timestamp as any) ??
                                  new Date(),

                              end_timestamp:
                                  toDate(ft.end_timestamp as any) ?? null,
                              status: ft.status ?? 'working',
                              total_pause_duration:
                                  ft.total_pause_duration ?? 0,

                              pause_start_timestamp:
                                  toDate(ft.pause_start_timestamp as any) ??
                                  null,

                              transferred_from: toObjectId(
                                  ft.transferred_from as any,
                              ),
                          }),
                      ),
                  }))
                : [],
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
        if (dto.progress !== undefined) {
            const toDate = OrderFactory.toMaybeDate;
            const toObjectId = OrderFactory.toMaybeObjectId;
            doc.progress = dto.progress.map((p: ProgressDto) => ({
                employee: toObjectId(String(p.employee)) as any,
                shift: p.shift,
                category: p.category ?? 'production',
                is_qc: p.is_qc ?? false,
                qc_step: p.qc_step ?? null,
                files_tracking: (p.files_tracking || []).map(
                    (ft: FilesTrackingDto) => ({
                        file_name: ft.file_name,

                        start_timestamp:
                            toDate(ft.start_timestamp as any) ?? new Date(),

                        end_timestamp: toDate(ft.end_timestamp as any) ?? null,
                        status: ft.status ?? 'working',
                        total_pause_duration: ft.total_pause_duration ?? 0,

                        pause_start_timestamp:
                            toDate(ft.pause_start_timestamp as any) ?? null,

                        transferred_from: toObjectId(
                            ft.transferred_from as any,
                        ),
                    }),
                ),
            }));
        }

        return doc;
    }
}
