import { Change } from '@repo/common/utils/changes-generate';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateApprovalBodyDto {
    @IsIn(['User', 'Report', 'Employee', 'Order', 'Client', 'Schedule'])
    target_model:
        | 'User'
        | 'Report'
        | 'Employee'
        | 'Order'
        | 'Client'
        | 'Schedule';

    @IsIn(['create', 'update', 'delete'])
    action: 'create' | 'update' | 'delete';

    // Required for update/delete
    @IsOptional()
    @IsString()
    object_id?: string;

    // Required for update
    @IsOptional()
    @IsArray()
    changes?: Change[];

    // Required for create
    @IsOptional()
    @IsObject()
    new_data?: Record<string, any> | null;

    // Required for delete
    @IsOptional()
    @IsObject()
    deleted_data?: Record<string, any> | null;
}
